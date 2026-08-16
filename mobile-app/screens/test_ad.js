const visiblePosts = [{id:'1'}, {id:'2'}, {id:'3'}, {id:'4'}];
const feedItems = [];
let postCounter = 0;
for (let i = 0; i < visiblePosts.length; i++) {
  feedItems.push({ ...visiblePosts[i], type: 'post' });
  postCounter++;
  if (postCounter % 3 === 0) {
    feedItems.push({ id: `ad_${i}`, type: 'ad' });
  }
}
console.log(feedItems);
