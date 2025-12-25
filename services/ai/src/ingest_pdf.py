import os
import uuid
from pathlib import Path
from typing import List
from qdrant_client import QdrantClient
from qdrant_client.http import models
from .config import settings
from .core import ai_models

# PDF processing
try:
    import PyPDF2
except ImportError:
    print("⚠️ PyPDF2 not installed. Run: pip install PyPDF2")
    PyPDF2 = None

client = QdrantClient(url=settings.QDRANT_URL)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF file"""
    if not PyPDF2:
        raise ImportError("PyPDF2 is required. Install with: pip install PyPDF2")
    
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            print(f"   📄 Reading {len(pdf_reader.pages)} pages...")
            
            for page_num, page in enumerate(pdf_reader.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
                
                if page_num % 10 == 0:
                    print(f"      Processed {page_num}/{len(pdf_reader.pages)} pages")
        
        print(f"   ✅ Extracted {len(text)} characters")
        return text
    except Exception as e:
        print(f"   ❌ Error reading PDF: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split text into chunks with overlap
    
    Args:
        text: Input text
        chunk_size: Maximum characters per chunk
        overlap: Number of characters to overlap between chunks
    
    Returns:
        List of text chunks
    """
    # Clean text
    text = text.replace('\n\n\n', '\n\n').strip()
    
    # Split by paragraphs first
    paragraphs = text.split('\n\n')
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # If adding this paragraph exceeds chunk_size
        if len(current_chunk) + len(para) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                # Keep overlap from end of previous chunk
                current_chunk = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
            
            # If single paragraph is too long, split it
            if len(para) > chunk_size:
                words = para.split()
                temp_chunk = ""
                for word in words:
                    if len(temp_chunk) + len(word) + 1 > chunk_size:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                            temp_chunk = temp_chunk[-overlap:] if len(temp_chunk) > overlap else ""
                    temp_chunk += " " + word
                if temp_chunk.strip():
                    current_chunk = temp_chunk.strip()
            else:
                current_chunk = para
        else:
            current_chunk += "\n\n" + para if current_chunk else para
    
    # Add last chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks

def ingest_pdfs():
    """
    Ingest all PDF files from knowledge directory into Qdrant
    """
    print("📚 Bắt đầu nạp kiến thức từ PDF vào Qdrant...")
    
    # Recreate collection
    print(f"🗑️  Recreating collection: {settings.DOCS_COLLECTION}")
    client.recreate_collection(
        collection_name=settings.DOCS_COLLECTION,
        vectors_config=models.VectorParams(
            size=settings.TEXT_VECTOR_SIZE, 
            distance=models.Distance.COSINE
        ),
    )
    
    # Find all PDF files
    knowledge_dir = Path("./knowledge")
    if not knowledge_dir.exists():
        print(f"❌ Directory not found: {knowledge_dir}")
        return
    
    pdf_files = list(knowledge_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("❌ No PDF files found in knowledge directory")
        return
    
    print(f"📂 Found {len(pdf_files)} PDF files")
    
    all_points = []
    
    # Process each PDF
    for pdf_file in pdf_files:
        print(f"\n📖 Processing: {pdf_file.name}")
        
        # Extract text
        text = extract_text_from_pdf(str(pdf_file))
        if not text:
            print(f"   ⚠️ Skipping (no text extracted)")
            continue
        
        # Chunk text
        print(f"   ✂️  Chunking text...")
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        print(f"   ✅ Created {len(chunks)} chunks")
        
        # Embed and create points
        print(f"   🧮 Creating embeddings...")
        for i, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
            
            # Get embedding
            vector = ai_models.get_text_embedding(chunk)
            
            # Create point
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{pdf_file.name}_{i}_{chunk[:50]}"))
            
            all_points.append(models.PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "content": chunk,
                    "source": pdf_file.name,
                    "chunk_index": i,
                    "chunk_size": len(chunk)
                }
            ))
            
            if (i + 1) % 10 == 0:
                print(f"      Embedded {i + 1}/{len(chunks)} chunks")
        
        print(f"   ✅ Processed {len(chunks)} chunks from {pdf_file.name}")
    
    # Upload to Qdrant in batches
    if all_points:
        print(f"\n📤 Uploading {len(all_points)} points to Qdrant...")
        
        batch_size = 100
        total_batches = (len(all_points) + batch_size - 1) // batch_size
        
        for i in range(0, len(all_points), batch_size):
            batch = all_points[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            print(f"   📦 Uploading batch {batch_num}/{total_batches} ({len(batch)} points)...")
            client.upsert(collection_name=settings.DOCS_COLLECTION, points=batch)
        
        print(f"\n✅ HOÀN TẤT! Đã nạp {len(all_points)} chunks kiến thức vào Qdrant")
        print(f"📊 Collection: {settings.DOCS_COLLECTION}")
        print(f"🔍 Vector size: {settings.TEXT_VECTOR_SIZE}")
    else:
        print("⚠️ No points to upload")

if __name__ == "__main__":
    ingest_pdfs()
