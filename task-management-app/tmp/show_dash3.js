const fs = require('fs');
try {
  let content = fs.readFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/src/Pages/DashboardPage.tsx');
  // convert buffer to string, stripping null bytes explicitly if they exist
  let str = '';
  for(let i=0; i<content.length; i++) {
    if (content[i] !== 0 && content[i] !== 13) str += String.fromCharCode(content[i]);
  }
  const lines = str.split('\n');
  let res = [];
  let added = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('EmployeeOfTheMonthCard') || lines[i].includes('marketer_manager') || lines[i].includes('userRole ===')) {
      added = true;
      const start = Math.max(0, i - 10);
      const end = Math.min(lines.length - 1, i + 10);
      for (let j = start; j <= end; j++) {
        if (lines[j] && lines[j].trim() !== '') res.push((j + 1) + ': ' + lines[j].trim());
      }
      res.push('---');
    }
  }
  if (!added) res.push("No matches found...");
  fs.writeFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/tmp/found2.txt', res.join('\n'));
} catch (e) {
  fs.writeFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/tmp/found2.txt', "ERROR: " + e.message);
}
