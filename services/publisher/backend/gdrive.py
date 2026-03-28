"""
Google Drive integration — upload and manage backup files.

Uses OAuth2 with a saved refresh token for personal Google accounts.
On first run, performs a one-time browser auth flow which saves the token.
Subsequent runs use the stored token silently (no user interaction).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import redis

from .settings import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]

_SA_KEY_PATH = Path(__file__).resolve().parent.parent / "secrets" / "gdrive-sa-key.json"
_TOKEN_PATH = Path(__file__).resolve().parent.parent / "secrets" / "gdrive-token.json"


def _redis():
    return redis.Redis.from_url(settings.REDIS_URL)


# ── Drive Config (stored in Redis) ───────────────────────────────

class DriveConfig:
    """Read/write Google Drive config from Redis."""
    KEY = "backup:drive_config"

    @staticmethod
    def get() -> dict:
        r = _redis()
        raw = r.get(DriveConfig.KEY)
        if raw:
            return json.loads(raw)
        return {
            "enabled": False,
            "folder_id": "",
            "upload_after_backup": True,
        }

    @staticmethod
    def set(config: dict):
        r = _redis()
        r.set(DriveConfig.KEY, json.dumps(config))


# ── Drive Service ────────────────────────────────────────────────

def _get_drive_service():
    """Build an authenticated Google Drive API service.

    Uses OAuth2 with a saved refresh token (for personal accounts).
    Falls back to Service Account if no OAuth token exists.
    """
    from googleapiclient.discovery import build

    # Try OAuth2 token first (works with personal Drive storage)
    if _TOKEN_PATH.exists():
        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_file(str(_TOKEN_PATH), SCOPES)

        # Refresh if expired
        if creds.expired and creds.refresh_token:
            try:
                from google.auth.transport.requests import Request
                creds.refresh(Request())
                # Save refreshed token
                _TOKEN_PATH.write_text(creds.to_json())
            except Exception as e:
                # Token revoked or invalid — delete it so user can re-auth
                logger.warning(f"OAuth token refresh failed: {e}. Removing stale token.")
                _TOKEN_PATH.unlink(missing_ok=True)
                raise FileNotFoundError(
                    "OAuth token expired or revoked. Please re-authenticate via the Drive settings panel."
                ) from e

        return build("drive", "v3", credentials=creds, cache_discovery=False)

    # Fallback: Service Account (for Shared Drives / Workspace)
    if _SA_KEY_PATH.exists():
        from google.oauth2 import service_account

        credentials = service_account.Credentials.from_service_account_file(
            str(_SA_KEY_PATH), scopes=SCOPES
        )
        return build("drive", "v3", credentials=credentials, cache_discovery=False)

    raise FileNotFoundError(
        "No Drive credentials found. Please authenticate via the Drive settings panel."
    )


def get_sa_email() -> str | None:
    """Read the SA email from the key file, or the OAuth user email."""
    if _TOKEN_PATH.exists():
        # OAuth flow — get the user email from the token
        try:
            data = json.loads(_TOKEN_PATH.read_text())
            # The token file might have client_id but not email directly
            # We can get it from the userinfo after auth
            return data.get("account", data.get("client_id", "OAuth2 User"))
        except Exception:
            return "OAuth2 User"
    if _SA_KEY_PATH.exists():
        data = json.loads(_SA_KEY_PATH.read_text())
        return data.get("client_email")
    return None


def get_auth_status() -> dict:
    """Check the current auth status."""
    if _TOKEN_PATH.exists():
        return {
            "method": "oauth2",
            "authenticated": True,
            "token_file": str(_TOKEN_PATH),
        }
    if _SA_KEY_PATH.exists():
        data = json.loads(_SA_KEY_PATH.read_text())
        return {
            "method": "service_account",
            "authenticated": True,
            "sa_email": data.get("client_email"),
            "note": "SA may have storage quota issues on personal Drive",
        }
    return {
        "method": None,
        "authenticated": False,
    }


# ── OAuth2 Setup ─────────────────────────────────────────────────

def generate_auth_url(redirect_uri: str) -> dict[str, str]:
    """Generate an OAuth2 authorization URL.
    
    redirect_uri should be the publisher's callback URL, e.g.
    http://localhost:9001/api/backup/drive/auth/callback
    """
    oauth_path = _SA_KEY_PATH.parent / "gdrive-oauth.json"
    if not oauth_path.exists():
        return {
            "error": "Need OAuth client credentials. Download from Google Cloud Console → "
                     "Credentials → Create OAuth Client ID (Desktop app) → "
                     f"Save as {oauth_path}"
        }

    from google_auth_oauthlib.flow import Flow
    import secrets as _secrets

    flow = Flow.from_client_secrets_file(str(oauth_path), scopes=SCOPES, redirect_uri=redirect_uri)
    state = _secrets.token_urlsafe(32)

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )

    # Store state + code_verifier + redirect_uri in Redis for the callback
    r = _redis()
    data = json.dumps({
        "redirect_uri": redirect_uri,
        "code_verifier": flow.code_verifier,
    })
    r.setex(f"oauth:state:{state}", 600, data)  # 10 min expiry

    return {"auth_url": auth_url, "state": state}


def complete_auth(auth_code: str, state: str) -> dict[str, str]:
    """Complete the OAuth2 flow with the authorization code from Google's redirect."""
    oauth_path = _SA_KEY_PATH.parent / "gdrive-oauth.json"
    if not oauth_path.exists():
        return {"error": "OAuth client config not found"}

    # Retrieve stored state data from Redis
    r = _redis()
    stored = r.get(f"oauth:state:{state}")
    if not stored:
        return {"error": "OAuth state expired or invalid. Please try again."}
    
    state_data = json.loads(stored.decode())
    r.delete(f"oauth:state:{state}")
    
    redirect_uri = state_data["redirect_uri"]
    code_verifier = state_data.get("code_verifier")

    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_secrets_file(str(oauth_path), scopes=SCOPES, redirect_uri=redirect_uri)
    flow.code_verifier = code_verifier
    flow.fetch_token(code=auth_code)

    creds = flow.credentials
    _TOKEN_PATH.write_text(creds.to_json())

    return {"status": "authenticated", "token_saved": str(_TOKEN_PATH)}


def run_local_auth():
    """Run the full OAuth2 flow locally (opens browser). Use for initial setup."""
    oauth_path = _SA_KEY_PATH.parent / "gdrive-oauth.json"
    if not oauth_path.exists():
        print(f"ERROR: Need OAuth client credentials at {oauth_path}")
        print("Go to Google Cloud Console → Credentials → Create OAuth Client ID → Desktop app")
        print("Download the JSON and save it there.")
        return

    from google_auth_oauthlib.flow import InstalledAppFlow

    flow = InstalledAppFlow.from_client_secrets_file(str(oauth_path), SCOPES)
    creds = flow.run_local_server(port=0)

    _TOKEN_PATH.write_text(creds.to_json())
    print(f"Token saved to {_TOKEN_PATH}")
    print("Google Drive auth complete! You can now use backup sync.")


# ── Upload ───────────────────────────────────────────────────────

def upload_to_drive(filepath: Path, folder_id: str) -> dict[str, Any]:
    """Upload a file to Google Drive, using revision versioning.

    Strategy:
    - If a file with the same name already exists in the folder → update it
      (this creates a new revision, preserving history).
    - If not → create a new file.

    Returns: {file_id, name, size, version, web_link}
    """
    from googleapiclient.http import MediaFileUpload

    service = _get_drive_service()
    filename = filepath.name

    # Check if file already exists in the folder
    query = f"name = '{filename}' and '{folder_id}' in parents and trashed = false"
    results = service.files().list(
        q=query, fields="files(id, name)", spaces="drive",
        supportsAllDrives=True, includeItemsFromAllDrives=True,
    ).execute()
    existing = results.get("files", [])

    media = MediaFileUpload(
        str(filepath),
        mimetype="application/json",
        resumable=True,
    )

    if existing:
        # Update existing file → creates a new revision
        file_id = existing[0]["id"]
        updated = service.files().update(
            fileId=file_id,
            media_body=media,
            fields="id, name, size, version, webViewLink",
            keepRevisionForever=True,
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Updated Drive file {filename} → revision {updated.get('version')}")
        return {
            "file_id": updated["id"],
            "name": updated["name"],
            "size": int(updated.get("size", 0)),
            "version": updated.get("version"),
            "web_link": updated.get("webViewLink"),
            "action": "updated",
        }
    else:
        # Create new file
        file_metadata = {
            "name": filename,
            "parents": [folder_id],
        }
        created = service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, name, size, version, webViewLink",
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Created Drive file {filename} → {created['id']}")
        return {
            "file_id": created["id"],
            "name": created["name"],
            "size": int(created.get("size", 0)),
            "version": created.get("version"),
            "web_link": created.get("webViewLink"),
            "action": "created",
        }


# ── List files in Drive folder ───────────────────────────────────

def list_drive_backups(folder_id: str) -> list[dict]:
    """List backup files in the Drive folder."""
    service = _get_drive_service()
    query = f"'{folder_id}' in parents and trashed = false"
    results = service.files().list(
        q=query,
        fields="files(id, name, size, modifiedTime, version, webViewLink)",
        orderBy="modifiedTime desc",
        pageSize=50,
        supportsAllDrives=True, includeItemsFromAllDrives=True,
    ).execute()

    return [
        {
            "file_id": f["id"],
            "name": f["name"],
            "size_mb": round(int(f.get("size", 0)) / (1024 * 1024), 2),
            "modified_at": f.get("modifiedTime"),
            "version": f.get("version"),
            "web_link": f.get("webViewLink"),
        }
        for f in results.get("files", [])
    ]


# ── Get revision history ────────────────────────────────────────

def get_file_revisions(file_id: str) -> list[dict]:
    """Get revision history for a Drive file."""
    service = _get_drive_service()
    results = service.revisions().list(
        fileId=file_id,
        fields="revisions(id, modifiedTime, size, keepForever)",
        pageSize=100,
    ).execute()

    return [
        {
            "revision_id": rev["id"],
            "modified_at": rev.get("modifiedTime"),
            "size_mb": round(int(rev.get("size", 0)) / (1024 * 1024), 2),
            "keep_forever": rev.get("keepForever", False),
        }
        for rev in results.get("revisions", [])
    ]


def download_from_drive(file_id: str, dest_path: Path) -> Path:
    """Download a file from Google Drive to a local path."""
    import io
    from googleapiclient.http import MediaIoBaseDownload

    service = _get_drive_service()

    # Get file metadata for the name
    meta = service.files().get(
        fileId=file_id, fields="name", supportsAllDrives=True,
    ).execute()
    filename = meta["name"]
    filepath = dest_path / filename

    request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
    with open(filepath, "wb") as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

    logger.info(f"Downloaded {filename} from Drive ({filepath.stat().st_size} bytes)")
    return filepath


# ── Test connection ──────────────────────────────────────────────

def test_drive_connection(folder_id: str) -> dict[str, Any]:
    """Test Drive access by listing the target folder."""
    try:
        service = _get_drive_service()
        folder = service.files().get(
            fileId=folder_id, fields="id, name, capabilities",
            supportsAllDrives=True,
        ).execute()
        return {
            "status": "connected",
            "folder_name": folder.get("name"),
            "folder_id": folder_id,
            "sa_email": get_sa_email(),
        }
    except FileNotFoundError as e:
        return {"status": "error", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ── CLI entry point ──────────────────────────────────────────────

if __name__ == "__main__":
    run_local_auth()
