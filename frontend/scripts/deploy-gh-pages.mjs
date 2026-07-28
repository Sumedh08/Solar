import { promises as fs } from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const repoRoot = process.cwd()
const distDir = path.resolve(repoRoot, 'dist')
const deployDir = 'C:\\ghp-solar-deploy'

async function main() {
    await assertDirExists(distDir)
    await fs.rm(deployDir, { recursive: true, force: true })
    await fs.mkdir(deployDir, { recursive: true })

    runGit(['init'], deployDir)
    runGit(['checkout', '-b', 'gh-pages'], deployDir)
    runGit(['config', 'user.name', 'github-actions[bot]'], deployDir)
    runGit(['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], deployDir)

    await fs.cp(distDir, deployDir, { recursive: true })
    await fs.writeFile(path.join(deployDir, '.nojekyll'), '')

    runGit(['add', '-A'], deployDir)
    runGit(['commit', '-m', 'deploy: publish frontend to gh-pages'], deployDir)

    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
        cwd: repoRoot,
        encoding: 'utf8',
    }).trim()

    runGit(['remote', 'add', 'origin', remoteUrl], deployDir)
    runGit(['push', '--force', 'origin', 'gh-pages'], deployDir)
}

async function assertDirExists(dir) {
    try {
        const stat = await fs.stat(dir)
        if (!stat.isDirectory()) {
            throw new Error(`Expected a directory at ${dir}`)
        }
    } catch (error) {
        throw new Error(`Missing build output: ${dir}. Run the build first.`)
    }
}

function runGit(args, cwd) {
    execFileSync('git', args, { cwd, stdio: 'inherit' })
}

main().catch((error) => {
    console.error(error.message || error)
    process.exit(1)
})
