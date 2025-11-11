/**
 * Appium Server Manager
 *
 * Manages the Appium server lifecycle within the Electron application.
 * Starts/stops the Appium server programmatically.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export interface AppiumServerStatus {
  running: boolean;
  port: number;
  url: string;
  pid?: number;
}

class AppiumServerManager {
  private serverProcess: ChildProcess | null = null;
  private port: number = 4723;
  private isRunning: boolean = false;

  /**
   * Start Appium server
   */
  async startServer(): Promise<AppiumServerStatus> {
    if (this.isRunning || this.serverProcess) {
      console.log('🚀 [Appium Server] Already running or starting');
      return this.getStatus();
    }

    console.log('🚀 [Appium Server] Starting Appium server on port', this.port);

    return new Promise((resolve, reject) => {
      try {
        // Get path to locally installed appium
        const appiumPath = path.join(process.cwd(), 'node_modules', '.bin', 'appium');

        // Start Appium with xcuitest driver
        this.serverProcess = spawn(appiumPath, [
          '--port', this.port.toString(),
          '--log-level', 'info',
          '--allow-insecure', 'chromedriver_autodownload',
          '--base-path', '/'
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
        });

        // Handle stdout
        this.serverProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          console.log('🚀 [Appium Server]', output.trim());

          // Check if server started successfully
          if (output.includes('Appium REST http interface listener started')) {
            this.isRunning = true;
            console.log('🚀 [Appium Server] Started successfully');
            resolve(this.getStatus());
          }
        });

        // Handle stderr
        this.serverProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          console.error('🚀 [Appium Server Error]', output.trim());

          // Some errors are warnings, only reject on critical errors
          if (output.includes('Error:') && !this.isRunning) {
            reject(new Error(`Appium server failed to start: ${output}`));
          }
        });

        // Handle process exit
        this.serverProcess.on('exit', (code) => {
          console.log(`🚀 [Appium Server] Process exited with code ${code}`);
          this.isRunning = false;
          this.serverProcess = null;
        });

        // Handle process error
        this.serverProcess.on('error', (error) => {
          console.error('🚀 [Appium Server] Process error:', error);
          this.isRunning = false;
          this.serverProcess = null;
          reject(error);
        });

        // Timeout after 30 seconds if not started
        setTimeout(() => {
          if (!this.isRunning) {
            this.stopServer();
            reject(new Error('Appium server failed to start within 30 seconds'));
          }
        }, 30000);

      } catch (error: any) {
        console.error('🚀 [Appium Server] Failed to start:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop Appium server
   */
  async stopServer(): Promise<void> {
    if (!this.serverProcess) {
      console.log('🚀 [Appium Server] Not running');
      return;
    }

    console.log('🚀 [Appium Server] Stopping server');

    return new Promise((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      this.serverProcess.once('exit', () => {
        console.log('🚀 [Appium Server] Stopped successfully');
        this.isRunning = false;
        this.serverProcess = null;
        resolve();
      });

      // Try graceful shutdown first
      this.serverProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.serverProcess) {
          console.log('🚀 [Appium Server] Force killing process');
          this.serverProcess.kill('SIGKILL');
          this.isRunning = false;
          this.serverProcess = null;
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * Get server status
   */
  getStatus(): AppiumServerStatus {
    return {
      running: this.isRunning,
      port: this.port,
      url: `http://127.0.0.1:${this.port}`,
      pid: this.serverProcess?.pid
    };
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Restart server
   */
  async restartServer(): Promise<AppiumServerStatus> {
    console.log('🚀 [Appium Server] Restarting server');
    await this.stopServer();
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.startServer();
  }
}

// Export singleton instance
export const appiumServerManager = new AppiumServerManager();
