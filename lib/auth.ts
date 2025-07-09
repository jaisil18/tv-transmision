import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

// Configuración de autenticación
const JWT_SECRET = process.env.JWT_SECRET || 'uct-tv-codecraft-secret-key-2024';
const TOKEN_EXPIRY = '24h';

// Interfaz para usuario
export interface User {
  username: string;
  password: string;
  lastLogin?: string;
  loginAttempts?: number;
  lockedUntil?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
}

// Configuración por defecto
const DEFAULT_USER: User = {
  username: 'admin',
  password: '$2b$12$VO.SDgYdio2bTSsQGlqPyuDdo2ruGeBaHbgEKNNz8JbZJ/nrIrU4O', // admin12345
};

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutos

// Asegurar que existe el directorio de datos
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Obtener usuarios
export async function getUsers(): Promise<User[]> {
  try {
    await ensureDataDirectory();
    const content = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Si no existe el archivo, crear uno con el usuario por defecto
    const users = [DEFAULT_USER];
    await saveUsers(users);
    return users;
  }
}

// Guardar usuarios
export async function saveUsers(users: User[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Obtener usuario por username
export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => user.username === username) || null;
}

// Verificar si la cuenta está bloqueada (TEMPORALMENTE DESHABILITADO)
export function isAccountLocked(user: User): boolean {
  // DESHABILITADO TEMPORALMENTE PARA DEBUGGING
  return false;
  // if (!user.lockedUntil) return false;
  // return new Date(user.lockedUntil) > new Date();
}

// Incrementar intentos de login fallidos
export async function incrementLoginAttempts(username: string): Promise<void> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex !== -1) {
    const user = users[userIndex];
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_TIME).toISOString();
    }
    
    await saveUsers(users);
  }
}

// Resetear intentos de login
export async function resetLoginAttempts(username: string): Promise<void> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex !== -1) {
    users[userIndex].loginAttempts = 0;
    users[userIndex].lockedUntil = undefined;
    users[userIndex].lastLogin = new Date().toISOString();
    await saveUsers(users);
  }
}

// Verificar contraseña
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Hash de contraseña
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Generar JWT token
export function generateToken(username: string): string {
  return jwt.sign(
    { 
      username, 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    },
    JWT_SECRET
  );
}

// Verificar JWT token
export function verifyToken(token: string): { username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    return decoded;
  } catch {
    return null;
  }
}

// Middleware de autenticación
export async function requireAuth(request: NextRequest): Promise<{ user: User } | NextResponse> {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
  
  const user = await getUserByUsername(decoded.username);
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
  }
  
  return { user };
}

// Generar token de recuperación
export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Cambiar contraseña
export async function changePassword(username: string, newPassword: string): Promise<boolean> {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) return false;
    
    users[userIndex].password = await hashPassword(newPassword);
    users[userIndex].resetToken = undefined;
    users[userIndex].resetTokenExpiry = undefined;
    
    await saveUsers(users);
    return true;
  } catch {
    return false;
  }
}

// Generar token de recuperación para usuario
export async function generatePasswordResetToken(username: string): Promise<string | null> {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) return null;
    
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora
    
    users[userIndex].resetToken = resetToken;
    users[userIndex].resetTokenExpiry = resetTokenExpiry;
    
    await saveUsers(users);
    return resetToken;
  } catch {
    return null;
  }
}

// Verificar token de recuperación
export async function verifyResetToken(token: string): Promise<User | null> {
  try {
    const users = await getUsers();
    const user = users.find(u => u.resetToken === token);
    
    if (!user || !user.resetTokenExpiry) return null;
    
    if (new Date(user.resetTokenExpiry) < new Date()) {
      return null; // Token expirado
    }
    
    return user;
  } catch {
    return null;
  }
}
