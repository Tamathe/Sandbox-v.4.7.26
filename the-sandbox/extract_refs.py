import re
import os

referenced = set()

# Walk app directory
for dirpath, dirnames, filenames in os.walk('./app'):
    # Skip node_modules and .next  
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.next', 'api')]
    
    for filename in filenames:
        if filename.endswith(('.ts', '.tsx', '.js', '.jsx')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = re.findall(r"/api/[a-zA-Z0-9/_\[\]\-\.]+", content)
                    for match in matches:
                        match = re.sub(r'[?#].*$', '', match)
                        match = match.rstrip('/')
                        match = re.sub(r'/route$', '', match)
                        if match.startswith('/api/') and len(match) > 6:
                            referenced.add(match)
            except:
                pass

for path in sorted(referenced):
    print(path)
