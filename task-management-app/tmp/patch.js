const fs = require('fs');
const file = 'd:/office work/chages-TMS/TMS-FRONTEND/task-management-app/src/Pages/DashboardPage.tsx';
let str = fs.readFileSync(file, 'utf-8');
const target = "const canSee = roleKey === 'admin' || roleKey === 'super_admin' || roleKey === 'manager' || roleKey === 'md_manager' || roleKey === 'ob_manager' || roleKey === 'all_manager';";
const replacement = "const canSee = roleKey === 'admin' || roleKey === 'super_admin' || roleKey === 'manager' || roleKey === 'md_manager' || roleKey === 'ob_manager' || roleKey === 'all_manager' || roleKey === 'marketer_manager';";
if (str.includes(target)) {
  str = str.replace(target, replacement);
  fs.writeFileSync(file, str);
  console.log("Successfully replaced the condition.");
} else {
  // Try fallback logic if the buffer has null characters
  console.log("Target not found normally. Trying UTF16 logic.");
  let content = fs.readFileSync(file);
  let cleanStr = '';
  // Assuming utf8 with strange padding or utf16
  for(let i=0; i<content.length; i++) {
     cleanStr += String.fromCharCode(content[i]); // hacky binary read
  }
  let index = cleanStr.indexOf(target);
  if (index !== -1) {
    let before = cleanStr.substring(0, index);
    let after = cleanStr.substring(index + target.length);
    let finalStr = before + replacement + after;
    // convert back to buffer
    let outBuf = Buffer.alloc(finalStr.length);
    for(let i=0; i<finalStr.length; i++){
      outBuf[i] = finalStr.charCodeAt(i);
    }
    fs.writeFileSync(file, outBuf);
    console.log("Successfully replaced using binary logic.");
  } else {
     console.log("Target not found!");
  }
}
