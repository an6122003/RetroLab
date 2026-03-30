#!/bin/bash

# Configuration: Source and Destination mapping
# format: "source_file:destination_file"
CREDENTIALS=(
    "credentials/root/.env:.env"
    "credentials/services/news-pipeline/.env:services/news-pipeline/.env"
    "credentials/services/publisher/root.env:services/publisher/.env"
    "credentials/services/publisher/frontend.env:services/publisher/frontend/.env"
)

# Directories to copy content from
# format: "source_dir:destination_dir"
DIRECTORIES=(
    "credentials/services/publisher/secrets:services/publisher/secrets"
)

echo " Deploying credentials..."

# Copy files
for entry in "${CREDENTIALS[@]}"; do
    src="${entry%%:*}"
    dest="${entry#*:}"
    
    if [ -f "$src" ]; then
        # Create directory if it doesn't exist
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        echo "✅ Copied $src ➔ $dest"
    else
        echo "⚠️  Warning: Source file $src not found, skipping."
    fi
done

# Copy directories
for entry in "${DIRECTORIES[@]}"; do
    src="${entry%%:*}"
    dest="${entry#*:}"
    
    if [ -d "$src" ]; then
        mkdir -p "$dest"
        cp -r "$src/"* "$dest/"
        echo "✅ Copied contents of $src ➔ $dest"
    else
        echo "⚠️  Warning: Source directory $src not found, skipping."
    fi
done

echo "🎉 Credentials deployment complete!"
