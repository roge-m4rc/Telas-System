const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Aseguramos el Rol
  const adminRol = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: { nombre: 'Administrador' },
  });

  // Creamos el usuario con los campos exactos que pide tu esquema
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@telas.com' },
    update: {},
    create: {
      email: 'admin@telas.com',
      password: hashedPassword,
      nombre: 'Admin Principal',
      activo: true, // <-- Cambiado de 'estado' a 'activo' según tu error
      rol: {
        connect: { id: adminRol.id }
      }
    },
  });

  console.log('✅ ¡LISTO! Usuario creado con éxito:', admin.email);
  console.log('🔑 Email: admin@telas.com | Password: admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });