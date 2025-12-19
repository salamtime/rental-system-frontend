import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const SecondDriverDetailsModal = ({ isOpen, onClose, rental }) => {
  if (!isOpen || !rental) return null;

  const hasSecondDriverInfo = rental.second_driver_name || rental.second_driver_license || rental.second_driver_id_image;

  if (!hasSecondDriverInfo) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Second Driver Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {rental.second_driver_name ? (
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="col-span-1 font-semibold">Name</p>
              <p className="col-span-2">{rental.second_driver_name}</p>
            </div>
          ) : null}
          {rental.second_driver_license ? (
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="col-span-1 font-semibold">License</p>
              <p className="col-span-2">{rental.second_driver_license}</p>
            </div>
          ) : null}
          {!rental.second_driver_name && !rental.second_driver_license && !rental.second_driver_id_image && (
             <p>No second driver details available.</p>
          )}

          {rental.second_driver_id_image && (
            <div className="space-y-2 pt-2">
              <p className="font-semibold">ID Image</p>
              <a href={rental.second_driver_id_image} target="_blank" rel="noopener noreferrer" title="Click to view full image">
                <img
                  src={rental.second_driver_id_image}
                  alt="Second Driver ID"
                  className="rounded-lg w-full cursor-pointer border hover:shadow-lg transition-shadow"
                />
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecondDriverDetailsModal;