const { Octokit } = require("@octokit/rest");
const { exec } = require('child_process');
const fs = require('fs');

const octokit = new Octokit({
  auth: "your_github_token" // Ganti dengan GitHub Token aplikasi
});

// Repo konfigurasi
const owner = 'ClousCloud';
const repo = 'XPocketMP-server';

async function fixCode(prNumber) {
  // Ambil perubahan dari PR
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber
  });

  for (const file of files) {
    if (file.filename.endsWith('.php')) {
      // Download file
      const filePath = file.filename;
      const { data: fileContent } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath
      });

      // Decode konten file
      const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      fs.writeFileSync(filePath, content);

      // Jalankan PHP Code Beautifier untuk memperbaiki kode
      exec(`phpcbf ${filePath}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error: ${stderr}`);
          return;
        }
        console.log(`Fixed file: ${filePath}`);
        
        // Push perubahan ke branch
        commitAndPushChanges(filePath, prNumber);
      });
    }
  }
}

async function commitAndPushChanges(filePath, prNumber) {
  // Tambah file ke git dan commit
  exec(`git add ${filePath} && git commit -m "Fix PHP Code Style"`, async (err, stdout, stderr) => {
    if (err) {
      console.error(`Error committing: ${stderr}`);
      return;
    }
    // Push perubahan ke GitHub
    await octokit.pulls.create({
      owner,
      repo,
      title: "Bot PHP Code Fix",
      head: `fix-php-${prNumber}`,
      base: "stable",
      body: "Perbaikan kode PHP otomatis"
    });
    console.log(`Pull request created for ${filePath}`);
  });
}

// Deteksi PR baru dan jalankan bot
octokit.pulls.list({
  owner,
  repo,
  state: 'open'
}).then(prs => {
  prs.data.forEach(pr => {
    fixCode(pr.number);
  });
});
