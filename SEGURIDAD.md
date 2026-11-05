# 🛡️ SEGURIDAD Y PROTECCIÓN DE DATOS — AXEL PLAY

La arquitectura de seguridad de **AXEL PLAY** está diseñada desde el primer día bajo los principios de **Minimización de Datos**, **Privacidad por Diseño** y cumplimiento con las normativas de protección de menores y la Ley 1581 de 2012 (Habeas Data).

---

## 1. MINIMIZACIÓN DE DATOS PARA ESTUDIANTES

1. **Cero Datos Sensibles Requeridos:**
   - Los estudiantes **NO** crean cuenta ni proporcionan correo electrónico, contraseñas, número telefónico ni número de identificación escolar/personal.
   - Solo ingresan un **Apodo (Nickname)** y eligen un **Avatar**.
2. **Acceso Efímero:**
   - La presencia del estudiante existe únicamente mientras la sesión esté activa. Al concluir la partida, no quedan rastreadores de cookies invasivas.

---

## 2. SEGURIDAD DEL ACCESO MEDIANTE CÓDIGO QR

1. **Tokens Criptográficamente Seguros:**
   - Los tokens de sesión se generan con `crypto.getRandomValues` (32 caracteres hexadecimales de alta entropía).
   - Es imposible adivinar o realizar ataques de fuerza bruta sobre los tokens de sala.
2. **Ciclo de Vida y Expiración:**
   - Cada QR tiene una expiración predeterminada (2 horas) o expira de forma inmediata cuando el docente finaliza la partida.
3. **Regeneración y Revocación Dinámica:**
   - Si un participante no autorizado accede o el código se filtra indebidamente, el docente cuenta con el botón **"Regenerar QR"**, el cual invalida el token anterior de inmediato y genera uno nuevo sin reiniciar la partida.

---

## 3. AUTORIZACIÓN Y ROW LEVEL SECURITY (RLS) EN SUPABASE

En caso de utilizar Supabase como backend remoto:

1. **Aislamiento Multi-Docente:**
   - Políticas RLS estrictas donde cada docente autenticado mediante JWT solo puede consultar, modificar y eliminar sus propios cuestionarios y sesiones:
     ```sql
     CREATE POLICY "Teachers can only access their own games"
     ON games FOR ALL
     USING (auth.uid() = teacher_id);
     ```
2. **Validación Server-Side:**
   - Las respuestas y el cálculo de puntajes se procesan mediante funciones almacenadas (`submit_answer`), evitando que un cliente manipulado altere su puntuación directamente desde la consola del navegador.

---

## 4. GESTIÓN DE SECRETOS Y VARIABLES DE ENTORNO

1. Las claves de Supabase para el cliente web son de tipo **Anon / Public Key**, las cuales son de solo lectura pública restringida por RLS.
2. **Nunca** incluir la `service_role` key ni claves privadas en el código frontend ni en repositorios públicos.
3. Todo archivo `.env` está expresamente excluido en `.gitignore`.
