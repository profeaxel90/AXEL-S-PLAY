// ============================================================
// AXEL'S PLAY - Gestor Integral de Copias de Seguridad (Backup & Restore)
// Exporta e importa toda la base de datos de la aplicación:
// Juegos, preguntas, tareas, calificaciones, fotos de cuadernos,
// grupos, docentes, audios e historial de sesiones.
// ============================================================
import { idbManager, type StoredMedia } from './indexedDBStorage';
import { audioEngine } from './audio';

export interface AxelsPlayBackup {
  metadata: {
    app: "AXEL'S PLAY";
    version: string;
    exportedAt: string;
    timestamp: number;
    description: string;
    stats: {
      gamesCount: number;
      homeworkCount: number;
      groupsCount: number;
      teachersCount: number;
      mediaCount: number;
      sessionsCount: number;
    };
  };
  storage: {
    games: string | null;
    homework: string | null;
    groups: string | null;
    teachers: string | null;
    sessionHistory: string | null;
    audioSettings: string | null;
    customSoundsMeta: string | null;
    questionBank: string | null;
  };
  indexedDB: {
    media: StoredMedia[];
  };
}

class BackupManager {
  /**
   * Genera y descarga el archivo JSON de copia de seguridad con todos los datos.
   */
  public async exportCompleteBackup(): Promise<{ fileName: string; stats: AxelsPlayBackup['metadata']['stats'] }> {
    if (typeof window === 'undefined') {
      throw new Error('La exportación solo puede ejecutarse en el navegador.');
    }

    // 1. Recopilar datos de localStorage y sessionStorage
    const gamesRaw = localStorage.getItem('axels_play_custom_games_v2');
    const homeworkRaw = localStorage.getItem('axels_play_homework_assignments');
    const groupsRaw = localStorage.getItem('axels_play_course_groups');
    const teachersRaw = localStorage.getItem('axelplay_local_accounts');
    const sessionHistoryRaw = localStorage.getItem('axels_play_session_history');
    const audioSettingsRaw = localStorage.getItem('axelplay_audio');
    const customSoundsMetaRaw = localStorage.getItem('axels_play_custom_sounds_meta');
    const questionBankRaw = sessionStorage.getItem('question_bank');

    // 2. Extraer todos los medios de IndexedDB (fotos de cuadernos y audios)
    const mediaList = await idbManager.getAllMedia();

    // 3. Contar registros
    const gamesCount = gamesRaw ? safeParseArrayLength(gamesRaw) : 0;
    const homeworkCount = homeworkRaw ? safeParseArrayLength(homeworkRaw) : 0;
    const groupsCount = groupsRaw ? safeParseArrayLength(groupsRaw) : 0;
    const teachersCount = teachersRaw ? safeParseArrayLength(teachersRaw) : 0;
    const sessionsCount = sessionHistoryRaw ? safeParseArrayLength(sessionHistoryRaw) : 0;
    const mediaCount = mediaList.length;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `axels_play_backup_${dateStr}_${timeStr}.json`;

    const backupData: AxelsPlayBackup = {
      metadata: {
        app: "AXEL'S PLAY",
        version: '2.5.0',
        exportedAt: now.toISOString(),
        timestamp: now.getTime(),
        description: 'Copia de seguridad completa de AXEL\'S PLAY (Juegos, Tareas, Grupos, Docentes, Fotos y Audios).',
        stats: {
          gamesCount,
          homeworkCount,
          groupsCount,
          teachersCount,
          mediaCount,
          sessionsCount,
        },
      },
      storage: {
        games: gamesRaw,
        homework: homeworkRaw,
        groups: groupsRaw,
        teachers: teachersRaw,
        sessionHistory: sessionHistoryRaw,
        audioSettings: audioSettingsRaw,
        customSoundsMeta: customSoundsMetaRaw,
        questionBank: questionBankRaw,
      },
      indexedDB: {
        media: mediaList,
      },
    };

    // 4. Generar enlace de descarga
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { fileName, stats: backupData.metadata.stats };
  }

  /**
   * Lee y valida un archivo de copia de seguridad seleccionado por el usuario.
   */
  public async validateBackupFile(file: File): Promise<AxelsPlayBackup> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result as string;
          const parsed = JSON.parse(content) as AxelsPlayBackup;

          if (!parsed.metadata || parsed.metadata.app !== "AXEL'S PLAY") {
            reject(new Error('El archivo no corresponde a una copia de seguridad válida de AXEL\'S PLAY.'));
            return;
          }

          if (!parsed.storage) {
            reject(new Error('El archivo de copia de seguridad está dañado o incompleto.'));
            return;
          }

          resolve(parsed);
        } catch {
          reject(new Error('El archivo no tiene un formato JSON válido.'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de copia de seguridad.'));
      reader.readAsText(file);
    });
  }

  /**
   * Restaura todos los datos contenidos en el backup hacia localStorage e IndexedDB.
   */
  public async restoreBackup(backup: AxelsPlayBackup): Promise<boolean> {
    try {
      // 1. Restaurar localStorage
      if (backup.storage.games !== null && backup.storage.games !== undefined) {
        localStorage.setItem('axels_play_custom_games_v2', backup.storage.games);
      }
      if (backup.storage.homework !== null && backup.storage.homework !== undefined) {
        localStorage.setItem('axels_play_homework_assignments', backup.storage.homework);
      }
      if (backup.storage.groups !== null && backup.storage.groups !== undefined) {
        localStorage.setItem('axels_play_course_groups', backup.storage.groups);
      }
      if (backup.storage.teachers !== null && backup.storage.teachers !== undefined) {
        localStorage.setItem('axelplay_local_accounts', backup.storage.teachers);
      }
      if (backup.storage.sessionHistory !== null && backup.storage.sessionHistory !== undefined) {
        localStorage.setItem('axels_play_session_history', backup.storage.sessionHistory);
      }
      if (backup.storage.audioSettings !== null && backup.storage.audioSettings !== undefined) {
        localStorage.setItem('axelplay_audio', backup.storage.audioSettings);
      }
      if (backup.storage.customSoundsMeta !== null && backup.storage.customSoundsMeta !== undefined) {
        localStorage.setItem('axels_play_custom_sounds_meta', backup.storage.customSoundsMeta);
      }
      if (backup.storage.questionBank !== null && backup.storage.questionBank !== undefined) {
        sessionStorage.setItem('question_bank', backup.storage.questionBank);
      }

      // 2. Restaurar IndexedDB (fotos y audios)
      if (backup.indexedDB?.media && Array.isArray(backup.indexedDB.media)) {
        await idbManager.restoreMediaList(backup.indexedDB.media);
      }

      // 3. Recargar motor de audio
      await audioEngine.loadCustomSounds();

      // 4. Notificar a todas las ventanas/componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('axels_play_sounds_updated'));
        window.dispatchEvent(new CustomEvent('axels_play_homework_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      return true;
    } catch (err) {
      console.error('Error restaurando copia de seguridad:', err);
      return false;
    }
  }
}

function safeParseArrayLength(jsonString: string): number {
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed.length : 1;
  } catch {
    return 0;
  }
}

export const backupManager = new BackupManager();
