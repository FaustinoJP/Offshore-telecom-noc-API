module.exports = function internalRoutesFactory(io) {
  const router = require("express").Router();

  router.get("/simulate-alarm", async (req, res) => {
    try {
      const alarm = {
        id: "sim-" + Date.now(),
        siteId: "site-002",
        severity: "Critical",
        state: "Open",
        equipment: "Microwave ODU",
        message: "Microwave link failure detected",
        startedAt: new Date().toISOString(),
      };

      io.emit("alarm.created", alarm);

      return res.json({
        success: true,
        message: "Alarm simulated",
        alarm,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
};
