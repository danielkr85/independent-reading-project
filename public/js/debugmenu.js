// Debug Menu System
// Allows skipping to different missions with Ctrl+M

export class DebugMenu {
  constructor() {
    this.isOpen = false;
    this.selectedMission = 1;
    
    // Listen for Ctrl+M
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'm') {
        this.isOpen = !this.isOpen;
        console.log('Debug menu toggled:', this.isOpen);
      }
    });
  }

  draw(ctx, canvasWidth, canvasHeight) {
    if (!this.isOpen) return;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEBUG MENU', canvasWidth / 2, 50);

    // Instructions
    ctx.fillStyle = '#ffff00';
    ctx.font = '14px monospace';
    ctx.fillText('Use UP/DOWN arrows to select mission', canvasWidth / 2, 100);
    ctx.fillText('Press ENTER to start mission', canvasWidth / 2, 130);
    ctx.fillText('Press ESC or Ctrl+M to close', canvasWidth / 2, 160);

    // Mission options
    const missions = [
      { id: 1, name: 'Mission 1: Collect Astrophage' },
      { id: 2, name: 'Mission 2: Receive Canisters' }
    ];

    const startY = 220;
    const spacing = 60;

    missions.forEach((mission, index) => {
      const y = startY + index * spacing;
      const isSelected = this.selectedMission === mission.id;

      if (isSelected) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(canvasWidth / 2 - 200, y - 25, 400, 50);
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = '#00ff00';
      }

      ctx.font = isSelected ? 'bold 18px monospace' : '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mission.name, canvasWidth / 2, y);
    });

    // Selection indicator
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('> ' + missions[this.selectedMission - 1].name + ' <', canvasWidth / 2, startY + (this.selectedMission - 1) * spacing);
  }

  handleInput(e) {
    if (!this.isOpen) return null;

    if (e.key === 'ArrowUp') {
      this.selectedMission = Math.max(1, this.selectedMission - 1);
      return true;
    } else if (e.key === 'ArrowDown') {
      this.selectedMission = Math.min(2, this.selectedMission + 1);
      return true;
    } else if (e.key === 'Enter') {
      return { action: 'selectMission', mission: this.selectedMission };
    } else if (e.key === 'Escape' || (e.ctrlKey && e.key === 'm')) {
      this.isOpen = false;
      return true;
    }

    return false;
  }

  close() {
    this.isOpen = false;
  }
}
