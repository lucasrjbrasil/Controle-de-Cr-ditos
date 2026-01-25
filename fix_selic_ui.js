const fs = require('fs');
const path = 'c:\\Users\\lucas\\Documents\\Antigravity\\Controle de Créditos\\src\\components\\SelicManager.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = /<td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">\s+\{rate\.data\}\s+<\/td>/;
const replacement = `<td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">
                                            {rate.data.includes('/') && rate.data.split('/').length === 3 
                                                ? rate.data.substring(3) 
                                                : rate.data}
                                        </td>`;

if (content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated SelicManager.jsx');
} else {
    console.log('Target not found in SelicManager.jsx');
    // Fallback to even more flexible match
    const fallbackTarget = /\{rate\.data\}/;
    // We need to be careful with fallback if there are multiple matches, 
    // but in this file, inside the map return, it should be unique for this context.
    // Let's try to match the surrounding <td>
    const flexibleTarget = /<td[^>]*font-mono[^>]*>\s*\{rate\.data\}\s*<\/td>/;
    if (content.match(flexibleTarget)) {
        content = content.replace(flexibleTarget, replacement);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully updated SelicManager.jsx using flexible target');
    } else {
        console.log('Flexible target also not found');
    }
}
