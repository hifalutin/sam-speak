const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });

const GOOGLE_API_KEY = 'AIzaSyBnCFfYw2AFkSFh6mpLnMGAp7drIiO6_rs';

exports.speak = onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({ error: 'Text is required' });
        return;
      }

      // Call Google Cloud TTS REST API with Journey voice (newest, best quality)
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: 'en-US-Journey-D',  // Journey voices are the newest and best quality
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: 0,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google TTS error:', error);
        throw new Error(`TTS API error: ${response.status}`);
      }

      const data = await response.json();

      res.status(200).json({
        audio: data.audioContent
      });

    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });
});
