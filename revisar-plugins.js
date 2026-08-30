import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const carpetaPlugins = path.join(process.cwd(), 'plugins')

function buscarArchivos(carpeta) {
  let archivos = []

  for (const item of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, item.name)

    if (item.isDirectory()) {
      archivos = archivos.concat(buscarArchivos(ruta))
    } else if (item.isFile() && item.name.endsWith('.js')) {
      archivos.push(ruta)
    }
  }

  return archivos
}

const archivos = buscarArchivos(carpetaPlugins)
let errores = 0

for (const archivo of archivos) {
  try {
    execFileSync(process.execPath, ['--check', archivo], {
      stdio: 'pipe'
    })

    console.log(`✅ ${archivo}`)
  } catch (error) {
    errores++

    console.log('
❌ ERROR EN ESTE ARCHIVO:')
    console.log(archivo)
    console.log(error.stderr.toString())
  }
}

console.log(`
Revisión terminada. Errores encontrados: ${errores}`)
