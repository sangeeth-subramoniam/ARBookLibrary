import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // WebGL backend
import "@tensorflow/tfjs-backend-cpu"; // CPU backend fallback

const ARBookScanner = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [bookBBox, setBookBBox] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const initializeTensorFlow = async () => {
      try {
        await tf.setBackend("webgl"); // Try WebGL backend
        console.log("WebGL backend initialized.");
      } catch (error) {
        console.warn("WebGL not available. Falling back to CPU backend.");
        await tf.setBackend("cpu"); // Fallback to CPU
      }

      await tf.ready();
      console.log("TensorFlow.js backend is ready.");

      const model = await cocoSsd.load();
      console.log("COCO-SSD model loaded.");

      const detectBooks = async () => {
        if (
          webcamRef.current &&
          webcamRef.current.video.readyState === 4 &&
          canvasRef.current
        ) {
          const video = webcamRef.current.video;
          const predictions = await model.detect(video);

          drawBoundingBoxes(predictions);

          const bookPrediction = predictions.find(
            (prediction) => prediction.class === "book"
          );

          if (bookPrediction) {
            setBookBBox(bookPrediction.bbox);
          } else {
            setBookBBox(null);
          }
        }
        requestAnimationFrame(detectBooks);
      };

      detectBooks();
    };

    initializeTensorFlow();
  }, []);

  const drawBoundingBoxes = (predictions) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = webcamRef.current.video.videoWidth;
    canvas.height = webcamRef.current.video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
      if (prediction.class === "book") {
        const [x, y, width, height] = prediction.bbox;

        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = "green";
        ctx.font = "16px Arial";
        ctx.fillText(
          `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
          x,
          y > 10 ? y - 5 : y + 15
        );
      }
    });
  };

  const handleScreenClick = async () => {
    if (!bookBBox) {
      console.log("No book detected to process.");
      return;
    }

    const [x, y, width, height] = bookBBox;
    await processBook(x, y, width, height);
  };

  const processBook = async (x, y, width, height) => {
    const video = webcamRef.current.video;

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(
      video,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );

    const croppedImage = tempCanvas.toDataURL("image/jpeg");

    try {
      // Step 1: Store the cropped image
      const saveResponse = await fetch("https://sicgaiken2.pythonanywhere.com/store-capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: croppedImage }),
      });

      const saveResult = await saveResponse.json();
      const { filePath } = saveResult;

      // Step 2: Fetch results from backend
      const fetchResponse = await fetch("https://sicgaiken2.pythonanywhere.com/fetch-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filePath }),
      });

      const fetchResult = await fetchResponse.json();

      setResults(fetchResult);
    } catch (error) {
      console.error("Error processing book:", error);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100vw",
        cursor: "pointer",
      }}
      onClick={handleScreenClick}
    >
      <Webcam
        ref={webcamRef}
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
        videoConstraints={{ facingMode: "environment" }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "300px",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
          padding: "15px",
          borderRadius: "10px",
          zIndex: 3,
        }}
      >
        <h3>Results</h3>
        {results ? (
          <>
            <p>
              <strong>Extracted Text:</strong> {results.extractedText}
            </p>
            <h4>Database Results:</h4>
            {results.dbResults.map((result, index) => (
              <div key={index}>
                <p>
                  <strong>{result.title}</strong> - {result.content}
                </p>
              </div>
            ))}
            <h4>Google Books Results:</h4>
            {results.googleBooksResults.map((book, index) => (
              <div key={index}>
                <p>
                  <strong>{book.title}</strong> - {book.authors.join(", ")}
                </p>
                <a href={book.infoLink} target="_blank" rel="noopener noreferrer">
                  View on Google Books
                </a>
              </div>
            ))}
          </>
        ) : (
          <p>Click on a book to process.</p>
        )}
      </div>
    </div>
  );
};

export default ARBookScanner;
