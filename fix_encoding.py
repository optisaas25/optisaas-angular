
import os

file_path = r"c:\Users\ASUS\.gemini\antigravity\playground\golden-cluster\frontend\src\app\features\client-management\fiches\monture-form\monture-form.component.html"

with open(file_path, 'rb') as f:
    content = f.read()

# Try to find the UTF-16 marker
# Start of appended content: <!-- ONGLET 3
marker_utf16 = b'<\x00!\x00-\x00-\x00 \x00O\x00N\x00G\x00L\x00E\x00T\x00 \x003\x00'
marker_utf8 = b'<!-- ONGLET 3'

appended_part = b""
base_part = b""

if marker_utf16 in content:
    print("Found UTF-16 appended content")
    parts = content.split(marker_utf16)
    base_part = parts[0] # Should be UTF-8 associated
    # The rest is UTF-16
    # We need to reconstruct the marker and the rest
    rest_utf16 = marker_utf16 + b"".join(parts[1:])
    try:
        appended_text = rest_utf16.decode('utf-16-le')
        appended_part = appended_text.encode('utf-8')
    except Exception as e:
        print(f"Error decoding UTF-16: {e}")
        exit(1)

elif marker_utf8 in content:
    print("Found UTF-8 appended content (or mixed but no nulls at start?)")
    # Maybe it's consistent UTF-8?
    # Let's assume consistent if marker is found as bytes
    parts = content.split(marker_utf8)
    # Check if the marker appeared BEFORE the end, we appended it to end.
    # We know we appended it.
    # Let's take the LAST occurrence if multiple?
    # Actually we want to separate proper file from appended part.
    # The appended part starts with the marker.
    base_part = parts[0]
    appended_part = marker_utf8 + b"".join(parts[1:])
else:
    print("Marker not found in common encodings")
    # Search for partial match?
    exit(1)

# Now we have base_part (bytes) and appended_part (bytes, utf-8)
# We need to fix the layout in base_part
# base_part should end with </form> ... </div> ... (maybe newlines)
# We want to insert appended_part BEFORE </form>

form_end = b'</form>'
if form_end not in base_part:
    print("Form end tag not found in base content")
    # Maybe it's encoded differently? 
    # Try decoding base_part to string
    try:
        base_str = base_part.decode('utf-8')
    except:
        base_str = base_part.decode('latin-1') # Fallback
    
    if '</form>' not in base_str:
        print("Still can't find form end")
        exit(1)
    
    # Re-encode to ensure utf-8
    base_part = base_str.encode('utf-8')

# Now split base_part
parts = base_part.rsplit(form_end, 1)
pre_form = parts[0]
post_form = parts[1] # Includes </form> effectively (no, rsplit removes it) -> actually rsplit returns [pre, post]

# Reconstruct: pre + appended + form_end + post
new_content = pre_form + b'\n' + appended_part + b'\n' + form_end + post_form

with open(file_path, 'wb') as f:
    f.write(new_content)

print("File repaired and layout fixed.")
