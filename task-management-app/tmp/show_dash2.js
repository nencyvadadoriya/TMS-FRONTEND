const fs = require('fs');
try {
  const content = fs.readFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/src/Pages/DashboardPage.tsx', 'utf-8');
  const lines = content.split('\n');
  let res = [];
  let added = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('EmployeeOfTheMonthCard') || lines[i].includes('marketer_manager')) {
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
  fs.writeFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/tmp/found.txt', res.join('\n'));
} catch (e) {
  fs.writeFileSync('d:/office work/chages-TMS/TMS-FRONTEND/task-management-app/tmp/found.txt', "ERROR: " + e.message);
}
