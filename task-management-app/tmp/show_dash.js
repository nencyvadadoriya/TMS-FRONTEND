const fs = require('fs');
const content = fs.readFileSync('src/Pages/DashboardPage.tsx', 'utf-8');
const lines = content.split('\n');
let res = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('EmployeeOfTheMonthCard') || lines[i].includes('marketer_manager')) {
    // get surrounding lines
    const start = Math.max(0, i - 10);
    const end = Math.min(lines.length - 1, i + 10);
    for (let j = start; j <= end; j++) {
      if (lines[j].trim()) res.push((j + 1) + ': ' + lines[j].trim());
    }
    res.push('---');
  }
}
fs.writeFileSync('tmp/found.txt', res.join('\n'));
