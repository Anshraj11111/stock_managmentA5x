#!/bin/bash

# Test script for file upload
# Usage: ./test-upload.sh YOUR_AUTH_TOKEN

TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo "❌ Error: Please provide auth token"
    echo "Usage: ./test-upload.sh YOUR_AUTH_TOKEN"
    echo ""
    echo "Get your token from browser localStorage after logging in:"
    echo "  localStorage.getItem('token')"
    exit 1
fi

echo "🧪 Testing File Upload"
echo "======================"
echo ""
echo "📁 File: sample_products.csv"
echo "🔑 Token: ${TOKEN:0:20}..."
echo ""

curl -X POST http://localhost:5000/api/import/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample_products.csv" \
  -v

echo ""
echo ""
echo "✅ Test complete!"
