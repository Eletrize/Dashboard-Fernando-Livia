# -*- coding: utf-8 -*-
import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix escaped quotes - replace \' with just '
content = content.replace("\\'", "'")

# Write the modified content back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed escaped quotes in HTML!")
