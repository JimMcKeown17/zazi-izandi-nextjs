"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

const galleryImages = [
  {
    src: "/images/gallery/Gallery 1.jpg",
    alt: "Education Assistants working with learners in a classroom",
  },
  {
    src: "/images/gallery/Gallery 2.jpg",
    alt: "Small group reading session with Foundation Phase learners",
  },
  {
    src: "/images/gallery/Gallery 3.jpg",
    alt: "Children practicing letter sounds during a Zazi iZandi lesson",
  },
  {
    src: "/images/gallery/Gallery 4.jpg",
    alt: "Learners engaged in a structured phonics activity",
  },
  {
    src: "/images/gallery/Gallery 5.jpg",
    alt: "Education Assistants receiving training on the program methodology",
  },
  {
    src: "/images/gallery/Gallery 7.png",
    alt: "Community event celebrating learner progress",
  },
  {
    src: "/images/gallery/Gallery 8.png",
    alt: "Children reading independently during free reading time",
  },
  {
    src: "/images/gallery/Gallery 9.jpg",
    alt: "A group of learners showing off their reading achievements",
  },
];

export default function GallerySection() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(
      selectedIndex === 0 ? galleryImages.length - 1 : selectedIndex - 1
    );
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(
      selectedIndex === galleryImages.length - 1 ? 0 : selectedIndex + 1
    );
  };

  return (
    <section className="bg-gray-50">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Photo Gallery
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Moments from the Program
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A visual look at Zazi iZandi in action — from classroom sessions to
            community celebrations.
          </p>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={400}
                height={400}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/30 transition-colors duration-300" />
            </button>
          ))}
        </div>

        {/* Lightbox dialog */}
        <Dialog
          open={selectedIndex !== null}
          onOpenChange={(open) => !open && setSelectedIndex(null)}
        >
          <DialogContent className="max-w-5xl p-0 bg-black/95 border-none gap-0">
            <DialogTitle className="sr-only">
              {selectedIndex !== null
                ? galleryImages[selectedIndex].alt
                : "Gallery image"}
            </DialogTitle>
            <DialogClose className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
              <X className="h-5 w-5 text-white" />
            </DialogClose>

            {selectedIndex !== null && (
              <div className="relative flex items-center justify-center min-h-[60vh]">
                {/* Previous button */}
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 z-50 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>

                {/* Image */}
                <div className="px-16 py-8">
                  <Image
                    src={galleryImages[selectedIndex].src}
                    alt={galleryImages[selectedIndex].alt}
                    width={1200}
                    height={800}
                    className="max-h-[75vh] w-auto mx-auto object-contain rounded"
                  />
                  <p className="text-white/70 text-center mt-4 text-sm">
                    {galleryImages[selectedIndex].alt}
                  </p>
                </div>

                {/* Next button */}
                <button
                  onClick={handleNext}
                  className="absolute right-4 z-50 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
