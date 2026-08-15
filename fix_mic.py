import re

with open('ios/App/App/Info.plist', 'r') as f:
    content = f.read()

if 'NSMicrophoneUsageDescription' not in content:
    new_keys = """	<key>NSMicrophoneUsageDescription</key>
	<string>RevitUp needs microphone access to record audio when you capture videos of your cars.</string>
</dict>
</plist>"""
    
    content = content.replace("</dict>\n</plist>", new_keys)
    
    with open('ios/App/App/Info.plist', 'w') as f:
        f.write(content)

