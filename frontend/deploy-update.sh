#!/bin/bash
# Deployment script for NORA live updates
# Usage: ./deploy-update.sh <version>

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "❌ Error: Version number required"
    echo "Usage: ./deploy-update.sh <version>"
    echo "Example: ./deploy-update.sh 1.0.1"
    exit 1
fi

echo "🚀 Deploying NORA update version $VERSION..."
echo ""

# Step 1: Build the app
echo "📦 Step 1: Building app..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build complete"
echo ""

# Step 2: Create bundle zip
echo "🗜️  Step 2: Creating bundle..."
cd www
zip -r ../$VERSION.zip ./* -q
cd ..
echo "✅ Bundle created: $VERSION.zip"
echo ""

# Step 3: Upload to server
echo "📤 Step 3: Uploading to server..."
echo ""
echo "You need to upload the following files to your server:"
echo "  1. Upload $VERSION.zip to: https://new.nora-nak.de/updates/bundles/$VERSION.zip"
echo "  2. Update manifest at: https://new.nora-nak.de/updates/manifest.json"
echo ""
echo "Manifest content should be:"
echo "{"
echo "  \"version\": \"$VERSION\","
echo "  \"url\": \"https://new.nora-nak.de/updates/bundles/$VERSION.zip\","
echo "  \"releaseNotes\": \"Update to version $VERSION\","
echo "  \"minAppVersion\": \"1.0.0\","
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
echo "}"
echo ""

# Uncomment and modify these lines if you have SSH access to your server:
# echo "Uploading bundle to server..."
# scp $VERSION.zip user@new.nora-nak.de:/var/www/updates/bundles/
#
# echo "Updating manifest on server..."
# ssh user@new.nora-nak.de "cat > /var/www/updates/manifest.json << EOF
# {
#   \"version\": \"$VERSION\",
#   \"url\": \"https://new.nora-nak.de/updates/bundles/$VERSION.zip\",
#   \"releaseNotes\": \"Update to version $VERSION\",
#   \"minAppVersion\": \"1.0.0\",
#   \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
# }
# EOF"

echo "✅ Bundle ready for upload!"
echo ""
echo "📋 Next steps:"
echo "  1. Upload $VERSION.zip to your server"
echo "  2. Update the manifest.json file"
echo "  3. Test by opening the app - it should detect and download the update"
echo "  4. Close and reopen the app - the update should be applied"
echo ""
echo "🎉 Deployment process complete!"
