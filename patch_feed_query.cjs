const fs = require('fs');
let code = fs.readFileSync('src/components/Feed.tsx', 'utf8');

const targetQuery = `  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });
    return unsubscribe;
  }, [refreshKey]);`;

const replacementQuery = `  useEffect(() => {
    setLoading(true);
    
    const pinnedQuery = query(
      collection(db, 'posts'),
      where('isPinned', '==', true)
    );
    
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let pinnedPosts: Post[] = [];
    let recentPosts: Post[] = [];

    const mergePosts = () => {
      // Remove any pinned posts from recent posts so they don't duplicate
      const recentWithoutPinned = recentPosts.filter(rp => !pinnedPosts.some(pp => pp.id === rp.id));
      
      // Sort pinned posts by createdAt desc (if multiple)
      const sortedPinned = [...pinnedPosts].sort((a, b) => b.createdAt - a.createdAt);
      
      setPosts([...sortedPinned, ...recentWithoutPinned]);
      setLoading(false);
    };

    const unsubPinned = onSnapshot(pinnedQuery, (snapshot) => {
      pinnedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      mergePosts();
    });

    const unsubRecent = onSnapshot(q, (snapshot) => {
      recentPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      mergePosts();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => {
      unsubPinned();
      unsubRecent();
    };
  }, [refreshKey]);`;

code = code.replace(targetQuery, replacementQuery);
fs.writeFileSync('src/components/Feed.tsx', code);
