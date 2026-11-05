#!/usr/bin/env python3
"""Run after editing css/style.css or anything in js/:  python3 tools/build_assets.py

1. Writes css/style.min.css (comments and extra whitespace removed) from css/style.css.
2. Stamps every page's CSS/JS links with ?v=<content hash>.

Browsers are told to cache css/ and js/ for a year (vercel.json), so the version stamp is
what makes a change show up right away. Edit style.css, never style.min.css.
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent

def minify_css(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)       # comments
    css = re.sub(r"\s+", " ", css)                         # collapse whitespace
    css = re.sub(r"\s*([{};])\s*", r"\1", css)             # around braces and semicolons
    css = re.sub(r",\s+(?=[^)]*(?:\(|$))", ",", css)        # after commas outside parentheses
    return css.replace(";}", "}").strip() + "\n"

src = root / "css/style.css"
(root / "css/style.min.css").write_text(minify_css(src.read_text()))
h = lambda p: hashlib.sha1((root / p).read_bytes()).hexdigest()[:10]
versions = {"css/style.min.css": h("css/style.min.css")}
for js in sorted((root / "js").glob("*.js")):
    versions[f"js/{js.name}"] = h(f"js/{js.name}")

for page in sorted(root.glob("**/*.html")):
    if "node_modules" in page.parts or page.parts[len(root.parts)] in ("pricing", "dashboard", "tools"):
        continue
    html = original = page.read_text()
    html = re.sub(r'((?:href)=")((?:\.\./|/)?)css/style(?:\.min)?\.css(?:\?v=\w+)?"', lambda m: f'{m.group(1)}{m.group(2)}css/style.min.css?v={versions["css/style.min.css"]}"', html)
    for path, v in versions.items():
        if path.startswith("js/"):
            html = re.sub(rf'(src=")((?:\.\./|/)?){re.escape(path)}(?:\?v=\w+)?"', lambda m: f'{m.group(1)}{m.group(2)}{path}?v={v}"', html)
    if html != original:
        page.write_text(html)
        print("stamped", page.relative_to(root))
print("css", len(src.read_text()) // 1024, "KB ->", len((root / "css/style.min.css").read_text()) // 1024, "KB")
