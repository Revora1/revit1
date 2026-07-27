import re

with open('ios/App/App/Info.plist', 'r') as f:
    content = f.read()

new_keys = """
	<key>NSCameraUsageDescription</key>
	<string>RevitUp needs camera access so you can take photos of your cars and share them with the community.</string>
	<key>NSPhotoLibraryUsageDescription</key>
	<string>RevitUp needs access to your photo library to let you upload photos and videos of your vehicles.</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>RevitUp needs access to save photos to your library.</string>
	<key>NSUserTrackingUsageDescription</key>
	<string>RevitUp uses this to deliver personalized ads and content to improve your experience.</string>
</dict>
"""

updated_content = content.replace("</dict>", new_keys)

with open('ios/App/App/Info.plist', 'w') as f:
    f.write(updated_content)

print("Info.plist updated!")
