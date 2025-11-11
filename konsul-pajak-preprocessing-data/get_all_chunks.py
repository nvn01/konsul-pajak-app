#!/usr/bin/env python3
"""
Retrieve all chunks from ChromaDB
Shows how to get all documents without the 300-chunk limit
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import chromadb
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent

# Load environment variables
load_dotenv(PROJECT_ROOT / ".env", override=True)

CHROMA_COLLECTION_NAME = "pajak_uu"

def get_all_chunks():
    """Retrieve all chunks from ChromaDB collection"""
    
    chroma_mode = os.environ.get("CHROMA_MODE", "cloud").lower()
    
    print("=" * 80)
    print("Retrieving All Chunks from ChromaDB")
    print("=" * 80)
    
    # Connect to ChromaDB
    if chroma_mode == "cloud":
        print("Connecting to ChromaDB Cloud...")
        client = chromadb.CloudClient(
            api_key=os.environ["CHROMA_API_KEY"],
            tenant=os.environ["CHROMA_TENANT"],
            database=os.environ["CHROMA_DATABASE"]
        )
    else:
        chroma_host = os.environ.get("CHROMA_HOST", "http://localhost:8000")
        print(f"Connecting to ChromaDB Self-hosted at {chroma_host}...")
        
        # Parse host and port
        if "://" in chroma_host:
            chroma_host = chroma_host.split("://")[1]
        
        if ":" in chroma_host:
            host, port = chroma_host.split(":")
            client = chromadb.HttpClient(host=host, port=int(port))
        else:
            client = chromadb.HttpClient(host=chroma_host, port=8000)
    
    try:
        # Get collection directly using native ChromaDB API
        collection = client.get_collection(name=CHROMA_COLLECTION_NAME)
        
        # Get total count
        total_count = collection.count()
        print(f"✓ Collection '{CHROMA_COLLECTION_NAME}' found")
        print(f"✓ Total documents: {total_count}")
        
        if total_count == 0:
            print("\n⚠ Collection is empty. Run create_database.py first.")
            return
        
        print("\n" + "=" * 80)
        print("Fetching all documents...")
        print("=" * 80)
        
        # Method 1: Get all documents at once (for smaller collections)
        if total_count <= 10000:
            all_data = collection.get()
            
            print(f"\n✓ Retrieved {len(all_data['ids'])} documents")
            
            # Display statistics
            print("\n" + "=" * 80)
            print("Statistics:")
            print("=" * 80)
            
            # Count by source
            sources = {}
            for metadata in all_data['metadatas']:
                source = metadata.get('source', 'Unknown')
                source_name = Path(source).name if source else 'Unknown'
                sources[source_name] = sources.get(source_name, 0) + 1
            
            print(f"\nDocuments by source:")
            for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
                print(f"  {source}: {count} chunks")
            
            # Show sample documents
            print("\n" + "=" * 80)
            print("Sample Documents (first 3):")
            print("=" * 80)
            
            for i in range(min(3, len(all_data['ids']))):
                print(f"\n[{i+1}] ID: {all_data['ids'][i]}")
                if all_data['metadatas'][i]:
                    print(f"    Source: {Path(all_data['metadatas'][i].get('source', 'Unknown')).name}")
                    print(f"    Page: {all_data['metadatas'][i].get('page', '?')}")
                if all_data['documents'][i]:
                    preview = all_data['documents'][i][:200].strip()
                    print(f"    Content: {preview}...")
            
            # Option to save to file
            print("\n" + "=" * 80)
            save = input("Save all chunks to JSON file? (y/n): ").lower()
            if save == 'y':
                import json
                output_file = PROJECT_ROOT / "all_chunks.json"
                
                # Prepare data for JSON
                chunks_data = []
                for i in range(len(all_data['ids'])):
                    chunks_data.append({
                        'id': all_data['ids'][i],
                        'content': all_data['documents'][i],
                        'metadata': all_data['metadatas'][i]
                    })
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        'total_chunks': len(chunks_data),
                        'collection': CHROMA_COLLECTION_NAME,
                        'chunks': chunks_data
                    }, f, ensure_ascii=False, indent=2)
                
                print(f"✓ Saved {len(chunks_data)} chunks to {output_file}")
        
        else:
            # Method 2: Paginated retrieval for large collections
            print(f"\n⚠ Large collection detected ({total_count} documents)")
            print("Using paginated retrieval...")
            
            batch_size = 1000
            all_chunks = []
            
            for offset in range(0, total_count, batch_size):
                limit = min(batch_size, total_count - offset)
                print(f"  Fetching {offset} to {offset + limit}...")
                
                batch = collection.get(
                    limit=limit,
                    offset=offset
                )
                
                all_chunks.extend(batch['ids'])
            
            print(f"\n✓ Retrieved {len(all_chunks)} documents in total")
        
        print("\n" + "=" * 80)
        print("✓ Done!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nMake sure:")
        print("1. ChromaDB server is running")
        print("2. Collection 'pajak_uu' exists (run create_database.py)")
        print("3. Connection settings in .env are correct")

if __name__ == "__main__":
    get_all_chunks()
