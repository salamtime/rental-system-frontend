import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import toast from 'react-hot-toast';

const DeleteVehicleModal = ({ vehicle, isOpen, onClose, onSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!vehicle) return;

    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) throw error;

      toast.success('Vehicle deleted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error(`Failed to delete vehicle: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Vehicle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Vehicle to be deleted:</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{vehicle.name}</p>
              <p className="text-sm text-gray-600">
                {vehicle.brand} {vehicle.model} ({vehicle.year})
              </p>
              <p className="text-sm text-gray-600">
                Plate: {vehicle.plate_number}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Vehicle
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteVehicleModal;