# MOX F22

WhatsApp bot — 15 sections — ~105 commands (AR + EN)

## Owners
- KANEKI 01064875257
- VITAN 01205872535

## Termux install
```bash
pkill -f node
cd $HOME
rm -rf MOX-F22 MOV-F22 MOS-F22 NERO-V2 session
cd /storage/emulated/0/Download
unzip -o MOX-F22.zip
cp -r MOX-F22 $HOME/
cd $HOME/MOX-F22
npm install
npm install long
node index.js
