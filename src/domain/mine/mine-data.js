export const MINE_WIDTH = 10;
export const MINE_HEIGHT = 8;
export const MINE_ITEMS = Object.freeze([
  { key: 'firestone', name: 'firestone', shape: [[1,1,1],[1,1,1],[1,1,1]] },
  { key: 'waterstone', name: 'waterstone', shape: [[1,1,1],[1,1,1],[1,1,0]] },
  { key: 'thunderstone', name: 'thunderstone', shape: [[0,1,0],[1,1,1],[0,1,0]] },
  { key: 'leafstone', name: 'leafstone', shape: [[0,1,0],[1,1,1],[1,1,1]] },
  { key: 'moonstone', name: 'moonstone', shape: [[1,1],[1,1]] },
  { key: 'sunstone', name: 'sunstone', shape: [[1,0,1],[0,1,0],[1,0,1]] },
  { key: 'nugget', name: 'nugget', shape: [[1,1,1],[1,1,1]] },
  { key: 'stardust', name: 'stardust', shape: [[1,1],[1,1]] },
  { key: 'helix_fossil', name: 'helix_fossil', shape: [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]] },
  { key: 'dome_fossil', name: 'dome_fossil', shape: [[1,1,1],[1,1,1],[0,1,0]] },
  { key: 'old_amber', name: 'old_amber', shape: [[1,1],[1,1],[1,1]] },
  { key: 'root_fossil', name: 'root_fossil', shape: [[1,1,0],[1,1,1],[0,1,1]] },
  { key: 'claw_fossil', name: 'claw_fossil', shape: [[1,0,1],[1,1,1],[1,0,1]] },
  { key: 'fossil', name: 'fossil', shape: [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]] },
]);
