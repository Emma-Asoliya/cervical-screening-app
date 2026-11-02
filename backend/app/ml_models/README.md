# Model files

Put these files from the notebook here (Google Drive folder
`cervical_v2_postonly/models/A1_small_cnn_post/`):

- `fold0.keras`, `fold1.keras`, `fold2.keras`, `fold3.keras`, `fold4.keras`
- `config.json` (written by the last cell of the notebook; it holds the decision threshold)

The app averages the five models. It does not start without them: the first upload
fails with "The analysis could not be completed" and the server log names the missing file.

Check that the app gives the same score as the notebook for one photo:

    cd backend
    python -m app.services.predictor path/to/an_after_acid_photo_640x480.jpg

Compare "abnormal score" with `score` from `predict_with_explanation` in the notebook.
