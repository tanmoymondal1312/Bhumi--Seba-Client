#!/bin/bash
# Build frontend and create deployment zip (PHP backend)
set -e

echo "Building frontend..."
npm run build

echo "Creating deployment package..."
cd dist
cp -r ../api ./api
cp ../.htaccess ./.htaccess

zip -r ~/Downloads/bhumi-seva-deploy.zip . -x "*.DS_Store"

rm -rf ./api ./.htaccess

echo ""
echo "Done! ~/Downloads/bhumi-seva-deploy.zip is ready."
echo "Upload to cPanel and extract in your domain folder."
echo ""
echo "First time setup:"
echo "  1. Create MySQL database in cPanel"
echo "  2. Edit .env in domain root with DB credentials"
echo "  3. Visit your site — tables create automatically"
