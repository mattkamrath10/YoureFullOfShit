# App Review notes draft

Last Storyteller is a moderated user-generated storytelling service. Users can browse, search, and filter public stories without an account. Email accounts can create stories, upload media, post anonymously, report content, and manage/delete their account.

Reviewer test path:
1. Open Discover and browse/search stories.
2. Create an email account or use a reviewer account supplied separately.
3. Use Tell Your Story to submit text or media. Stories remain pending until an administrator approves them.
4. Open a public story and use Report for objectionable content.
5. Use the account area to access Privacy, Terms, Community Guidelines, Support, and Delete Account.

Large authenticated videos use multipart uploads directly to Cloudflare R2; the application server only handles authenticated upload authorization and completion. Camera, microphone, speech recognition, and file selection are optional and requested only when the related feature is selected.

Before submission, supply reviewer credentials or a review-safe account creation/verification path. Do not include production credentials in this file.
