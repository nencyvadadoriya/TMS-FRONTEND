const fs = require('fs');
const file = 'd:/office work/chages-TMS/TMS-FRONTEND/task-management-app/src/Pages/DashboardPage.tsx';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/);
let output = '';
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes('download') || lines[i].toLowerCase().includes('employee') || lines[i].toLowerCase().includes('marketer_manager') || lines[i].toLowerCase().includes('card')) {
    output += (i + 1) + ': ' + lines[i] + '\n';
  }
}
fs.writeFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/tmp/output.txt', output);
