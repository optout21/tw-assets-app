# Testing

## Basic use case

1. Open app from https://assets.trustwallet.com --> Page loads, 'Log in with Github' button visible
2. Press 'Log in with Github', log in to Github (no action needed if already logged in)
3. Accept the prompt authorize the application (no action needed if authorized already)
  --> Add New Token form is shown
4. Fill Token Name
5. Select type, e.g. ERC20
6. Enter valid token contract ID
7. Select a logo .PNG file
8. Fill Website field
9. Fill Short description field
10. Press Check button --> if there is an error, fix it (e.g. image size is wrong)
11. Press Create Pull Request
 --> progress shown on button
 --> PR is created
Check the PR in Github, it contains the correct logo.png and info.json files.

### Variations

- Not yet logged in to Github in current browser session, or already logged in
- A fork of assets already exists for the Github user, or does not exist
- Normal browser window or Incognito mode
- Browser: Chrome, Firefox, Safari
- Desktop, mobile platform

