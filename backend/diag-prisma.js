
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
}

check();
