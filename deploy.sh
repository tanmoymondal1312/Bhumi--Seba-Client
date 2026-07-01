#!/bin/bash
# Build frontend and create deployment zip (PHP + SQLite backend)
set -e

echo "Building frontend..."
npm run build

echo "Creating deployment package..."
cd dist
cp -r ../api ./api
cp ../.htaccess ./.htaccess
cp ../.env ./.env

zip -r ~/Downloads/bhumi-seva-deploy.zip . -x "*.DS_Store" -x "*/seed.py" -x "*/seed.php"

rm -rf ./api ./.htaccess ./.env

echo ""
echo "Done! ~/Downloads/bhumi-seva-deploy.zip is ready."
echo ""
echo "Deploy steps:"
echo "  1. Upload bhumi-seva-deploy.zip to cPanel domain folder"
echo "  2. Extract"
echo "  3. Done! Pre-data সহ database আগে থেকেই আছে।"
echo ""
echo "  লগইন: মালিক (মোঃ রনি) → PIN: 9999"
echo "         স্টাফ (করিম উদ্দিন) → PIN: 1234"
