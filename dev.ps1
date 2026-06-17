wt `
  new-tab --title "SSH Tunnel" --suppressApplicationTitle powershell -NoExit -Command "ssh -N -L 3307:127.0.0.1:3306 root@45.32.24.240" `;`
  new-tab --title "Backend" --suppressApplicationTitle powershell -NoExit -Command "cd 'C:\Users\jerry\shop-hub\backend'; npm start" `;`
  new-tab --title "Frontend" --suppressApplicationTitle powershell -NoExit -Command "cd 'C:\Users\jerry\shop-hub'; npm start"
