#!/bin/sh

echo "Searching for BigInt/number mixing and serialization issues..."

# Math operations mixing BigInt and number
grep -rnE '(\d+n\s*[\+\-\*\/]\s*\d+|\d+\s*[\+\-\*\/]\s*\d+n)' . --include \*.ts --include \*.tsx

# Math functions with possible BigInt arguments
grep -rnE 'Math\.(floor|ceil|round|abs|max|min|pow|sqrt|trunc)\s*\([^)]+n' . --include \*.ts --include \*.tsx

# JSON.stringify on objects with possible BigInt
grep -rn 'JSON.stringify' . --include \*.ts --include \*.tsx

# Direct Number() conversion (may want to replace with toNumberSafe)
grep -rn 'Number(' . --include \*.ts --include \*.tsx

echo "Done."
