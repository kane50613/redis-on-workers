---
"redis-on-workers": patch
---

isolate pending replies per send call to avoid `Promise.all` mixups
