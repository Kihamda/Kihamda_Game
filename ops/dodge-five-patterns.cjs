const levels = {
  easy: { interval: 2.2, waves: [[1],[3],[2],[0],[4],[1]] },
  normal: { interval: 1.8, waves: [[0,2],[1,3],[2,4],[0,3],[1,4],[0,2]] },
  hard: { interval: 1.2, waves: [[0,1,3],[1,2,4],[0,2,3],[1,3,4],[0,1,4],[0,2,4]] },
  oni: { interval: 1.2, waves: [[1,2,3],[1,2,3,4],[0,2,3],[0,1,4],[0,1,2],[0,1,2,3]] },
  extreme: { interval: 1.2, waves: [[1,2,3],[1,2,3,4],[0,2,3],[0,1,4],[0,1,2],[0,1,2,3]] }
};
module.exports = levels;
