import re

with open('ios/App/App/Info.plist', 'r') as f:
    content = f.read()

if 'NSMicrophoneUsageDescription' not in content:
    new_keys = """	<key>NSCameraUsageDescription</key>
	<string>RevitUp needs camera access so you can take photos of your cars and share them with the community.</string>
	<key>NSMicrophoneUsageDescription</key>
	<string>RevitUp needs microphone access to record audio when you capture videos of your cars.</string>
	<key>NSPhotoLibraryUsageDescription</key>
	<string>RevitUp needs access to your photo library to let you upload photos and videos of your vehicles.</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>RevitUp needs access to save photos to your library.</string>
	<key>NSUserTrackingUsageDescription</key>
	<string>RevitUp uses this to deliver personalized ads and content to improve your experience.</string>
</dict>
</plist>"""
    
    content = content.replace("</dict>\n</plist>", new_keys)
    
    with open('ios/App/App/Info.plist', 'w') as f:
        f.write(content)

print("Info.plist updated safely!")
