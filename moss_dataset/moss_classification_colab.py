# ============================================================
# Moss Classification - Google Colab Training Script
# Classes: clean | heavymoss | lightmoss | mediummoss
# Model: MobileNetV2 (transfer learning)
# ============================================================
# Run each section as a separate Colab cell (marked by # %% [cell])

# %% [1] Install & Imports
# !pip install -q matplotlib seaborn scikit-learn

import os
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.applications import MobileNetV2
from sklearn.metrics import classification_report, confusion_matrix

print(f"TensorFlow: {tf.__version__}")
print(f"GPU: {tf.config.list_physical_devices('GPU')}")

# %% [2] Mount Google Drive & Extract Dataset
from google.colab import drive
drive.mount('/content/drive')

import zipfile
zip_path = '/content/drive/MyDrive/ML-TRAIN-AAW/Moss.v1i.folder.zip'
with zipfile.ZipFile(zip_path, 'r') as z:
    z.extractall('dataset')

# %% [3] Configuration
DATASET_DIR = 'dataset'  # adjust if your zip extracts to a subfolder
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 20
LEARNING_RATE = 1e-4
CLASS_NAMES = ['Clean', 'HeavyMoss', 'LightMoss', 'MediumMoss']
NUM_CLASSES = len(CLASS_NAMES)

TRAIN_DIR = os.path.join(DATASET_DIR, 'train')
VALID_DIR = os.path.join(DATASET_DIR, 'valid')
TEST_DIR  = os.path.join(DATASET_DIR, 'test')

# Verify structure
for split in [TRAIN_DIR, VALID_DIR, TEST_DIR]:
    classes = sorted(os.listdir(split))
    counts = {c: len(os.listdir(os.path.join(split, c))) for c in classes}
    print(f"{split}: {counts}")

# %% [4] Data Loading with Augmentation
train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=20,
    width_shift_range=0.15,
    height_shift_range=0.15,
    horizontal_flip=True,
    zoom_range=0.15,
    brightness_range=[0.85, 1.15],
    fill_mode='nearest'
)

val_test_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
    rescale=1.0 / 255
)

train_gen = train_datagen.flow_from_directory(
    TRAIN_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
    classes=CLASS_NAMES, class_mode='categorical', shuffle=True, seed=42
)

val_gen = val_test_datagen.flow_from_directory(
    VALID_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
    classes=CLASS_NAMES, class_mode='categorical', shuffle=False
)

test_gen = val_test_datagen.flow_from_directory(
    TEST_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
    classes=CLASS_NAMES, class_mode='categorical', shuffle=False
)

print(f"\nClass indices: {train_gen.class_indices}")

# %% [5] Handle Class Imbalance (auto-compute weights)
from sklearn.utils.class_weight import compute_class_weight

class_weights = compute_class_weight(
    'balanced', classes=np.arange(NUM_CLASSES), y=train_gen.classes
)
class_weight_dict = dict(enumerate(class_weights))
print(f"Class weights: {class_weight_dict}")

# %% [6] Build Model (MobileNetV2 + Custom Head)
base_model = MobileNetV2(
    weights='imagenet', include_top=False, input_shape=(*IMG_SIZE, 3)
)
base_model.trainable = False  # freeze base initially

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(128, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(NUM_CLASSES, activation='softmax')
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# %% [7] Train - Phase 1 (Frozen Base)
early_stop = callbacks.EarlyStopping(
    monitor='val_loss', patience=5, restore_best_weights=True
)
reduce_lr = callbacks.ReduceLROnPlateau(
    monitor='val_loss', factor=0.5, patience=3, min_lr=1e-7
)

history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS,
    class_weight=class_weight_dict,
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

# %% [8] Fine-Tune - Phase 2 (Unfreeze top layers)
base_model.trainable = True

# Freeze all layers except the last 30
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

history_fine = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=10,
    class_weight=class_weight_dict,
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

# %% [9] Plot Training History
def plot_history(hist, title_suffix=''):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(hist.history['accuracy'], label='Train')
    ax1.plot(hist.history['val_accuracy'], label='Val')
    ax1.set_title(f'Accuracy {title_suffix}')
    ax1.set_xlabel('Epoch')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(hist.history['loss'], label='Train')
    ax2.plot(hist.history['val_loss'], label='Val')
    ax2.set_title(f'Loss {title_suffix}')
    ax2.set_xlabel('Epoch')
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.show()

plot_history(history, '(Phase 1 - Frozen)')
plot_history(history_fine, '(Phase 2 - Fine-tuned)')

# %% [10] Evaluate on Test Set
test_loss, test_acc = model.evaluate(test_gen, verbose=1)
print(f"\nTest Accuracy: {test_acc:.4f}")
print(f"Test Loss:     {test_loss:.4f}")

# Classification Report
y_true = test_gen.classes
y_pred = np.argmax(model.predict(test_gen), axis=1)

print("\n" + "=" * 50)
print("Classification Report")
print("=" * 50)
print(classification_report(y_true, y_pred, target_names=CLASS_NAMES))

# Confusion Matrix
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
plt.title('Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.tight_layout()
plt.show()

# %% [11] Sample Predictions (Visual Check)
sample_imgs, sample_labels = next(test_gen)
preds = model.predict(sample_imgs[:8])

fig, axes = plt.subplots(2, 4, figsize=(16, 8))
for i, ax in enumerate(axes.flat):
    ax.imshow(sample_imgs[i])
    true_label = CLASS_NAMES[np.argmax(sample_labels[i])]
    pred_label = CLASS_NAMES[np.argmax(preds[i])]
    confidence = np.max(preds[i]) * 100
    color = 'green' if true_label == pred_label else 'red'
    ax.set_title(f'True: {true_label}\nPred: {pred_label} ({confidence:.1f}%)',
                 color=color, fontsize=10)
    ax.axis('off')
plt.suptitle('Sample Predictions', fontsize=14)
plt.tight_layout()
plt.show()

# %% [12] Save Model
model.save('moss_classifier_mobilenetv2.keras')
print("Model saved: moss_classifier_mobilenetv2.keras")

# Save as TFLite (for mobile deployment)
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()
with open('moss_classifier.tflite', 'wb') as f:
    f.write(tflite_model)
print("TFLite model saved: moss_classifier.tflite")

# Download models
from google.colab import files
files.download('moss_classifier_mobilenetv2.keras')
files.download('moss_classifier.tflite')

# %% [13] Robust Prediction (rejects out-of-domain images)
CONFIDENCE_THRESHOLD = 85.0   # minimum top-class confidence %
ENTROPY_THRESHOLD = 0.6       # max allowed entropy (uniform = 1.39 for 4 classes)

def compute_entropy(probs):
    """Shannon entropy of prediction distribution."""
    probs = np.clip(probs, 1e-10, 1.0)
    return -np.sum(probs * np.log(probs))

def predict_image(image_path, model, class_names,
                  conf_threshold=CONFIDENCE_THRESHOLD,
                  ent_threshold=ENTROPY_THRESHOLD):
    """Predict moss level with out-of-domain rejection."""
    img = tf.keras.preprocessing.image.load_img(image_path, target_size=IMG_SIZE)
    img_array = tf.keras.preprocessing.image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    pred = model.predict(img_array, verbose=0)[0]
    top_idx = np.argmax(pred)
    confidence = np.max(pred) * 100
    entropy = compute_entropy(pred)

    # Rejection logic: low confidence OR high entropy = not a valid container image
    is_valid = confidence >= conf_threshold and entropy <= ent_threshold

    if is_valid:
        label = class_names[top_idx]
        title = f'{label} ({confidence:.1f}%)'
        color = 'green'
    else:
        label = 'Unknown'
        title = (f'NOT RECOGNIZED\n'
                 f'Top guess: {class_names[top_idx]} ({confidence:.1f}%)\n'
                 f'Entropy: {entropy:.2f} (too uncertain)')
        color = 'red'

    plt.figure(figsize=(5, 5))
    plt.imshow(img)
    plt.title(title, color=color, fontsize=11)
    plt.axis('off')
    plt.show()

    # Print all class probabilities for transparency
    print(f"  Probabilities: ", end="")
    for i, name in enumerate(class_names):
        print(f"{name}: {pred[i]*100:.1f}%", end="  ")
    print(f"\n  Entropy: {entropy:.3f} (threshold: {ent_threshold})")
    print(f"  Confidence: {confidence:.1f}% (threshold: {conf_threshold}%)")

    return label, confidence, is_valid

# Example usage:
# predict_image('dataset/test/HeavyMoss/some_image.jpg', model, CLASS_NAMES)

# %% [14] Upload & Test Your Own Images (re-run this cell each time)
from google.colab import files

print("Upload one or more images to classify:")
print("(Random / non-container images will be flagged as Unknown)\n")
uploaded = files.upload()

for filename in uploaded.keys():
    print(f"\n{'='*50}")
    print(f"File: {filename}")
    print(f"{'='*50}")
    label, confidence, is_valid = predict_image(filename, model, CLASS_NAMES)
    if is_valid:
        print(f">> RESULT: {label} ({confidence:.1f}% confidence)")
    else:
        print(f">> RESULT: Image not recognized as a water container.")
        print(f"   The model is not confident this is a moss/container image.")
