const fs = require('fs');
const file = '/app/applet/mobile-app/screens/FeedScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Inject ads into the data array.
code = code.replace(
  'const visiblePosts = posts.filter(p => !blockedUsers.includes(p.authorId));',
  `const visiblePostsBase = posts.filter(p => !blockedUsers.includes(p.authorId));
  const feedItems = [];
  let postCounter = 0;
  for (let i = 0; i < visiblePostsBase.length; i++) {
    feedItems.push({ ...visiblePostsBase[i], type: 'post' });
    postCounter++;
    if (postCounter % 3 === 0 && nativeAd) {
      feedItems.push({ id: \`ad_\${i}\`, type: 'ad' });
    }
  }`
);

// Update FlatList data source
code = code.replace(
  'data={visiblePosts}',
  'data={feedItems}'
);

// Also replace `visiblePosts.length` in the render check
code = code.replace(
  'visiblePosts.length > 0',
  'feedItems.length > 0'
);

// 2. Modify renderPost to handle type === 'ad'
const adRenderCode = `
  const renderPost = ({ item, index }: { item: any, index: number }) => {
    if (item.type === 'ad') {
      return (
        <View style={[styles.postContainer, { height: containerHeight, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }]}>
           <NativeAdView style={{ width: '100%', padding: 20 }} nativeAd={nativeAd}>
              <View style={styles.adTopRow}>
                {nativeAd?.icon ? (
                  <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image source={{ uri: nativeAd.icon.url }} style={styles.advertiserLogo} />
                  </NativeAsset>
                ) : (
                  <View style={styles.advertiserLogoPlaceholder} />
                )}
                <View style={styles.advertiserTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <NativeAsset assetType={NativeAssetType.HEADLINE}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }} numberOfLines={1}>{nativeAd?.headline}</Text>
                    </NativeAsset>
                  </View>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#F5D547', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>SPONSORED</Text>
                  </View>
                </View>
              </View>
              
              <NativeAsset assetType={NativeAssetType.IMAGE}>
                  {nativeAd?.images && nativeAd.images.length > 0 ? (
                      <Image source={{ uri: nativeAd.images[0].url }} style={{ width: '100%', height: 300, borderRadius: 12, marginBottom: 16, resizeMode: 'cover' }} />
                  ) : (
                      <View style={{ width: '100%', height: 300, borderRadius: 12, marginBottom: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
                         <Ionicons name="image-outline" size={48} color="#333" />
                      </View>
                  )}
              </NativeAsset>

              <NativeAsset assetType={NativeAssetType.BODY}>
                  <Text style={{ color: '#fff', fontSize: 15, marginBottom: 20, lineHeight: 22 }}>{nativeAd?.body}</Text>
              </NativeAsset>

              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <TouchableOpacity style={{ backgroundColor: '#e53935', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }} activeOpacity={0.8}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' }}>{nativeAd?.callToAction || 'LEARN MORE'}</Text>
                </TouchableOpacity>
              </NativeAsset>
           </NativeAdView>
        </View>
      );
    }

    return (
      <View style={[styles.postContainer, { height: containerHeight }]}>
`;

// Replace the start of renderPost and remove the old Ad Overlay logic
// Let's use a regex to strip the old Ad Overlay completely
code = code.replace(
  /const renderPost = \(\{ item, index \}: \{ item: any, index: number \}\) => \{\s*return \(\s*<View style=\{\[styles\.postContainer, \{ height: containerHeight \}\]\}>/,
  adRenderCode
);

// We must also remove the old adOverlay rendering inside the post.
const oldAdOverlayPattern = /\{\/\* Ad Overlay for specific indices \*\/\}.*?<\/View>\s*\)\}/s;
code = code.replace(oldAdOverlayPattern, '');

fs.writeFileSync(file, code);
console.log('Feed screen patched for separate ad items');
