import os

dead_routes = []
with open('dead_routes_final.txt', 'r') as f:
    dead_routes = [line.strip() for line in f if line.strip()]

# Create output mapping routes to files
results = []

for route in dead_routes:
    # Convert /api/foo/bar to foo/bar
    route_rel = route.replace('/api/', '')
    
    # Try different variations to find the file
    route_ts = f"./app/api/{route_rel}/route.ts"
    route_js = f"./app/api/{route_rel}/route.js"
    
    if os.path.exists(route_ts):
        results.append((route, route_ts.replace('./', '')))
    elif os.path.exists(route_js):
        results.append((route, route_js.replace('./', '')))

# Print results
for route, file_path in sorted(results):
    print(f"{file_path}")
    
print(f"\nTotal dead routes with files: {len(results)}")
