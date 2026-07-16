import fs from 'fs';
import path from 'path';

const targetDir = path.resolve('node_modules/@capacitor-community/admob/ios/Sources/AdMobPlugin');
const targetFile = path.join(targetDir, 'CapacitorCompatibility.swift');

const content = `import Capacitor
import Foundation

extension CAPPluginCall {
    public func getBool(_ key: String) -> Bool? {
        return self.options[key] as? Bool
    }
    
    public func getInt(_ key: String) -> Int? {
        return self.options[key] as? Int
    }
    
    public func getFloat(_ key: String) -> Float? {
        if let val = self.options[key] as? Float {
            return val
        }
        if let val = self.options[key] as? Double {
            return Float(val)
        }
        return nil
    }
    
    public func getString(_ key: String) -> String? {
        return self.options[key] as? String
    }
    
    public func getArray(_ key: String) -> [Any]? {
        return self.options[key] as? [Any]
    }
    
    public func getObject(_ key: String) -> [String: Any]? {
        return self.options[key] as? [String: Any]
    }
    
    public func getArray<T>(_ key: String, _ type: T.Type) -> [T]? {
        return self.options[key] as? [T]
    }
}
`;

try {
    if (fs.existsSync(targetDir)) {
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('Successfully patched @capacitor-community/admob with Capacitor 8 Compatibility layer.');
    } else {
        console.warn('Warning: AdMob plugin source directory not found. Skipping patch.');
    }
} catch (error) {
    console.error('Failed to patch @capacitor-community/admob:', error);
}
