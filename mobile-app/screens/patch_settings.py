import re

with open('mobile-app/screens/ProfileScreen.tsx', 'r') as f:
    content = f.read()

# Add a function to render subviews just before return (
modal_code = """
  const renderSubViewContent = () => {
    switch (activeSubView) {
      case 'notifications':
        return (
          <View style={{ padding: 16 }}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Push Notifications</Text>
                <Text style={styles.settingsSubtitle}>Receive alerts on your device</Text>
              </View>
              <View style={{ backgroundColor: '#fff', width: 48, height: 24, borderRadius: 12, justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#000', width: 16, height: 16, borderRadius: 8, marginLeft: 28 }} />
              </View>
            </View>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Email Updates</Text>
                <Text style={styles.settingsSubtitle}>Weekly digest and news</Text>
              </View>
              <View style={{ backgroundColor: '#222', width: 48, height: 24, borderRadius: 12, justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#888', width: 16, height: 16, borderRadius: 8, marginLeft: 4 }} />
              </View>
            </View>
            <View style={{ marginTop: 24, padding: 16, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#333' }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>Phone Notification Diagnostics</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#222', padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold' }}>STATUS</Text>
                  <Text style={{ color: '#4caf50', fontSize: 10, fontWeight: 'bold' }}>● ACTIVE</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#222', padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold' }}>APP MODE</Text>
                  <Text style={{ color: '#4caf50', fontSize: 10, fontWeight: 'bold' }}>NATIVE APP</Text>
                </View>
              </View>
              <View style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.2)' }}>
                <Text style={{ color: '#4caf50', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>MOBILE INTEGRATION MODE</Text>
                <Text style={{ color: '#ccc', fontSize: 10 }}>You are running the official RevItUp mobile application. Native alerts are integrated directly with your device's system settings.</Text>
              </View>
            </View>
          </View>
        );
      case 'privacy':
        return (
          <View style={{ padding: 16 }}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Public Garage</Text>
                <Text style={styles.settingsSubtitle}>Anyone can see your vehicles</Text>
              </View>
              <View style={{ backgroundColor: '#fff', width: 48, height: 24, borderRadius: 12, justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#000', width: 16, height: 16, borderRadius: 8, marginLeft: 28 }} />
              </View>
            </View>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Hide License Plates</Text>
                <Text style={styles.settingsSubtitle}>Auto-blur plates in photos</Text>
              </View>
              <View style={{ backgroundColor: '#222', width: 48, height: 24, borderRadius: 12, justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#888', width: 16, height: 16, borderRadius: 8, marginLeft: 4 }} />
              </View>
            </View>
          </View>
        );
      case 'appearance':
        return (
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity style={{ flex: 1, height: 100, backgroundColor: '#000', borderWidth: 2, borderColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Dark</Text>
                <View style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' }} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity disabled style={{ flex: 1, height: 100, backgroundColor: '#111', borderWidth: 2, borderColor: '#333', borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Text style={{ color: '#555', fontWeight: 'bold' }}>Light (Soon)</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.settingsItem, { marginTop: 24 }]}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Reduce Motion</Text>
                <Text style={styles.settingsSubtitle}>Disable some animations</Text>
              </View>
              <View style={{ backgroundColor: '#222', width: 48, height: 24, borderRadius: 12, justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#888', width: 16, height: 16, borderRadius: 8, marginLeft: 4 }} />
              </View>
            </View>
          </View>
        );
      case 'data':
        return (
          <View style={{ padding: 16 }}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>High Quality Media</Text>
                <Text style={styles.settingsSubtitle}>Always upload and view high-res photos</Text>
              </View>
              <View style={{ backgroundColor: '#222', width: 48, height: 24, borderRadius: 12, justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#888', width: 16, height: 16, borderRadius: 8, marginLeft: 4 }} />
              </View>
            </View>
            
            <Text style={[styles.dangerZoneHeader, { marginTop: 16 }]}>PRIVACY RIGHTS (GDPR / CCPA)</Text>
            <View style={{ padding: 16, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Request Access</Text>
              <Text style={{ color: '#888', fontSize: 11, marginBottom: 16 }}>In compliance with GDPR and CCPA, you can download a complete copy of all your custom build details and profile info.</Text>
              <TouchableOpacity style={{ backgroundColor: '#222', padding: 12, borderRadius: 24, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Download Data Export</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#333', marginBottom: 24 }}>
              <Text style={{ color: '#e53935', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Request Erasure</Text>
              <Text style={{ color: '#888', fontSize: 11, marginBottom: 16 }}>Instantly and permanently delete your user account. This will recursively purge your profile details and vehicles.</Text>
              <TouchableOpacity style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)', padding: 12, borderRadius: 24, alignItems: 'center' }}>
                <Text style={{ color: '#e53935', fontSize: 12, fontWeight: 'bold' }}>Request Permanent Erasure</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Cache Storage</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>124 MB</Text>
            </View>
            <Text style={{ color: '#888', fontSize: 11, marginBottom: 16 }}>Clear cache to free up space. This won't delete your posts or cars.</Text>
            <TouchableOpacity style={{ backgroundColor: '#222', padding: 12, borderRadius: 24, alignItems: 'center' }} onPress={() => Alert.alert('Success', 'Cache cleared successfully! Freed up 124 MB of local assets.')}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        );
      case 'devices':
        return (
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: '#111', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="phone-portrait-outline" size={16} color="#888" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Current Device</Text>
                </View>
                <Text style={{ color: '#4caf50', fontSize: 12, marginTop: 4 }}>Active now</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#888', fontSize: 12 }}>RevitUp Mobile</Text>
                <Text style={{ color: '#888', fontSize: 12 }}>Native App</Text>
              </View>
            </View>
            <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 16 }}>You are only logged in on this device.</Text>
          </View>
        );
      case 'admob':
        return (
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: '#111', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="sparkles" size={16} color="#ff9800" />
                <Text style={{ color: '#ff9800', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>FEED INTEGRATION ONLY</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', fontStyle: 'italic', marginBottom: 8 }}>PREMIUM NATIVE FEED ADS</Text>
              <Text style={{ color: '#888', fontSize: 12, lineHeight: 18 }}>To maximize UI consistency and respect user focus, other intrusive ad formats are completely disabled. Google AdMob is integrated strictly as a beautifully customized native ad inside your feed.</Text>
            </View>

            <View style={{ padding: 16, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#333' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold' }}>GOOGLE ADMOB SDK DIAGNOSTICS</Text>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50' }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#222', padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold' }}>ENVIRONMENT</Text>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>● NATIVE MOBILE</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#222', padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold' }}>DEVICE PLATFORM</Text>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>MOBILE APP</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#222', padding: 12, borderRadius: 8 }}>
                <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 8 }}>ACTIVE AD UNIT IDS</Text>
                <Text style={{ color: '#ff9800', fontSize: 10, fontFamily: 'monospace' }}>Native Feed: Active</Text>
                <Text style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', textDecorationLine: 'line-through' }}>Banner: Disabled</Text>
                <Text style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', textDecorationLine: 'line-through' }}>Interstitial: Disabled</Text>
              </View>
            </View>
          </View>
        );
      case 'about':
        return (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, backgroundColor: '#111', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', fontStyle: 'italic' }}>R</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic', marginBottom: 4 }}>REVITUP</Text>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 24 }}>Version 1.2.310 (Build 310)</Text>

            <TouchableOpacity style={{ marginBottom: 16 }} onPress={() => setActiveSubView('user_guide')}>
              <Text style={{ color: '#aaa', fontSize: 14, fontWeight: 'bold' }}>User Guide / How to Use</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 16 }} onPress={() => setActiveSubView('tos')}>
              <Text style={{ color: '#aaa', fontSize: 14, fontWeight: 'bold' }}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 16 }} onPress={() => setActiveSubView('privacy_policy')}>
              <Text style={{ color: '#aaa', fontSize: 14, fontWeight: 'bold' }}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        );
      case 'tos':
        return (
          <ScrollView style={{ padding: 16 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>Last Updated: May 5, 2026</Text>
            <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>Welcome to RevItUp. By using our application, you agree to these Terms of Service. Please read them carefully.</Text>
            
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>1. Acceptance of Terms</Text>
            <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>By accessing and using RevItUp, you accept and agree to be bound by the terms and provision of this agreement.</Text>
            
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>2. User Account</Text>
            <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>You must be responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</Text>
            
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>3. Content</Text>
            <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material.</Text>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        );
      case 'privacy_policy':
      case 'user_guide':
        return (
          <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color="#555" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>View on Web</Text>
            <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>This document is hosted on our website for easy reading.</Text>
            <TouchableOpacity style={{ backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }} onPress={() => Linking.openURL('https://revitup.today')}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };
"""

content = content.replace("return (", modal_code + "\n  return (", 1)

main_menu = """
          {!activeSubView ? (
            <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsScrollContent} showsVerticalScrollIndicator={false}>
              {auth.currentUser?.email === 'tonyang11552883@gmail.com' && (
                <SettingsItem 
                  icon="shield-outline" title="Admin Panel" subtitle="MANAGE REPORTS AND USERS" 
                  onPress={() => { 
                    setShowSettings(false); 
                    navigation.navigate('Admin');
                  }} 
                />
              )}
              <SettingsItem 
                icon="notifications-outline" title="Notifications" subtitle="MANAGE PUSH ALERTS" 
                onPress={() => setActiveSubView('notifications')} 
              />
              <SettingsItem 
                icon="shield-checkmark-outline" title="Privacy" subtitle="WHO CAN SEE YOUR GARAGE" 
                onPress={() => setActiveSubView('privacy')} 
              />
              <SettingsItem 
                icon="moon-outline" title="Appearance" subtitle="DARK MODE, THEMES" 
                onPress={() => setActiveSubView('appearance')} 
              />
              <SettingsItem 
                icon="server-outline" title="Data & Storage" subtitle="MANAGE CACHE & DATA USAGE" 
                onPress={() => setActiveSubView('data')} 
              />
              <SettingsItem 
                icon="phone-portrait-outline" title="Connected Devices" subtitle="MANAGE ACTIVE SESSIONS" 
                onPress={() => setActiveSubView('devices')} 
              />
              <SettingsItem 
                icon="tv-outline" title="Google AdMob" subtitle="CONFIGURE & TEST MOBILE ADS" 
                onPress={() => setActiveSubView('admob')} 
              />
              <SettingsItem 
                icon="help-circle-outline" title="Support" subtitle="GET HELP WITH REVITUP" 
                onPress={() => Linking.openURL('mailto:support@revitup.today').catch(() => Alert.alert('Support', 'Contact us at support@revitup.today'))} 
              />
              <SettingsItem 
                icon="information-circle-outline" title="About" subtitle="APP VERSION, TERMS, PRIVACY POLICY" 
                onPress={() => setActiveSubView('about')} 
              />
              <SettingsItem 
                icon="shield-half-outline" title="Privacy Policy" subtitle="FULL GDPR DISCLOSURE" 
                onPress={() => setActiveSubView('privacy_policy')} 
              />
              
              {/* Fully active Cookie Consent Toggle */}
              <SettingsItem 
                icon={cookieConsent ? "lock-closed-outline" : "lock-open-outline"} 
                title="Cookie Consent" 
                subtitle={cookieConsent ? "CURRENTLY: ACCEPTED" : "CURRENTLY: DECLINED"} 
                iconBgColor={cookieConsent ? "#4caf50" : "#555"} 
                onPress={() => {
                  setCookieConsent(!cookieConsent);
                  if (cookieConsent) {
                    Alert.alert('Cookies Declined', 'Non-essential tracking has been disabled.');
                  } else {
                    Alert.alert('Cookies Accepted', 'Thank you for supporting personalized experiences.');
                  }
                }}
              />
              
              <SettingsItem 
                icon="share-social-outline" title="Invite Friends" subtitle="SHARE THE APP WITH OTHERS" 
                onPress={handleInvite} 
              />

              <Text style={styles.dangerZoneHeader}>DANGER ZONE</Text>
              <SettingsItem icon="log-out-outline" title="Log Out" subtitle="END CURRENT SESSION" isDanger onPress={handleSignOut} />
              <SettingsItem icon="trash-outline" title="Delete Account" subtitle="PERMANENTLY REMOVE DATA" isDanger onPress={handleDeleteAccount} />

              <Text style={styles.settingsFooter}>REVITUP V1.2.310 (BUILD 310) • GOOGLE CLOUD EDITION</Text>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' }}>
                <TouchableOpacity onPress={() => {
                  if (['tos', 'privacy_policy', 'user_guide'].includes(activeSubView)) {
                    setActiveSubView('about');
                  } else {
                    setActiveSubView(null);
                  }
                }} style={{ marginRight: 16 }}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {activeSubView.replace('_', ' ')}
                </Text>
              </View>
              {renderSubViewContent()}
            </View>
          )}
"""

# Replace the inner part of Modal
start_idx = content.find('<View style={styles.settingsModalHeader}>')
end_idx = content.find('</Modal>')
if start_idx != -1 and end_idx != -1:
    old_modal = content[start_idx:end_idx]
    
    new_modal = """<View style={styles.modalContainer}>
          {!activeSubView ? (
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
""" + main_menu + "        </View>\n      "
    
    content = content.replace(old_modal, new_modal)

with open('mobile-app/screens/ProfileScreen.tsx', 'w') as f:
    f.write(content)
