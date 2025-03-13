#!/bin/bash

# Clean up any previous build artifacts
rm -rf .vercel/output

# Deploy to Vercel
vercel deploy --prod 